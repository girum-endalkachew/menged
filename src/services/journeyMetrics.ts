import { Coordinate, Journey, TransitLeg, WalkingLeg, TransferLeg } from "@/types/journey";
import { JourneyMetrics } from "@/types/journeyMetrics";

export class JourneyMetricsService {
  /**
   * Fast equirectangular distance in meters accounting for cosine latitude scaling.
   * Essential for accurate geographic distance comparison near 9°N (Addis Ababa).
   */
  static calculateDistanceMeters(p1: Coordinate, p2: Coordinate): number {
    const avgLatRad = ((p1.latitude + p2.latitude) / 2) * (Math.PI / 180);
    const dLat = (p2.latitude - p1.latitude) * (Math.PI / 180);
    const dLon = (p2.longitude - p1.longitude) * (Math.PI / 180);
    const x = dLon * Math.cos(avgLatRad);
    const y = dLat;
    return Math.sqrt(x * x + y * y) * 6371000;
  }

  /**
   * Extract ordered sequence of WGS84 geometry points describing the complete journey path.
   * Prefers GTFS shapePoints for transit legs, falling back to orderedStops if unavailable.
   */
  static extractJourneyGeometryPoints(journey: Journey): Coordinate[] {
    const points: Coordinate[] = [journey.origin];

    for (const leg of journey.legs) {
      if (leg.type === "WALK") {
        points.push({ latitude: leg.from.latitude, longitude: leg.from.longitude });
        points.push({ latitude: leg.to.latitude, longitude: leg.to.longitude });
      } else if (leg.type === "TRANSIT") {
        if (leg.shapePoints && leg.shapePoints.length >= 2) {
          // shapePoints are GeoJSON [lng, lat]
          for (const sp of leg.shapePoints) {
            points.push({ latitude: sp[1], longitude: sp[0] });
          }
        } else if (leg.orderedStops && leg.orderedStops.length > 0) {
          for (const stop of leg.orderedStops) {
            points.push({ latitude: stop.latitude, longitude: stop.longitude });
          }
        } else {
          points.push({ latitude: leg.boardingStop.latitude, longitude: leg.boardingStop.longitude });
          points.push({ latitude: leg.alightingStop.latitude, longitude: leg.alightingStop.longitude });
        }
      } else if (leg.type === "TRANSFER") {
        points.push({ latitude: leg.fromStop.latitude, longitude: leg.fromStop.longitude });
        points.push({ latitude: leg.toStop.latitude, longitude: leg.toStop.longitude });
      }
    }

    points.push(journey.destination);

    // Deduplicate consecutive identical or near-identical coordinates (< 0.1 meters)
    const deduped: Coordinate[] = [];
    for (const pt of points) {
      if (deduped.length === 0) {
        deduped.push(pt);
      } else {
        const last = deduped[deduped.length - 1];
        if (this.calculateDistanceMeters(last, pt) >= 0.1) {
          deduped.push(pt);
        }
      }
    }

    return deduped;
  }

  /**
   * Calculate deterministic metrics for an already-valid Journey.
   */
  static calculateMetrics(journey: Journey): JourneyMetrics {
    const legs = journey.legs;
    const transitLegs = legs.filter((l): l is TransitLeg => l.type === "TRANSIT");
    const walkLegs = legs.filter((l): l is WalkingLeg => l.type === "WALK");
    const transferLegs = legs.filter((l): l is TransferLeg => l.type === "TRANSFER");

    // 1. Walking metrics
    const totalWalkingMeters =
      walkLegs.reduce((acc, l) => acc + l.distanceMeters, 0) +
      transferLegs.reduce((acc, l) => acc + l.distanceMeters, 0);

    const firstLeg = legs[0];
    const walkingBeforeFirstTransitMeters = firstLeg && firstLeg.type === "WALK" ? firstLeg.distanceMeters : 0;

    const lastLeg = legs[legs.length - 1];
    const walkingAfterLastTransitMeters = lastLeg && lastLeg.type === "WALK" ? lastLeg.distanceMeters : 0;

    // 2. Structural metrics
    const transfersCount = transferLegs.length;
    const estimatedDurationMinutes = journey.estimatedDurationMinutes;
    const transitLegsCount = transitLegs.length;

    // 3. Transit distance
    let transitDistanceMeters = 0;
    for (const tleg of transitLegs) {
      if (tleg.shapePoints && tleg.shapePoints.length >= 2) {
        for (let i = 0; i < tleg.shapePoints.length - 1; i++) {
          const p1: Coordinate = { latitude: tleg.shapePoints[i][1], longitude: tleg.shapePoints[i][0] };
          const p2: Coordinate = { latitude: tleg.shapePoints[i + 1][1], longitude: tleg.shapePoints[i + 1][0] };
          transitDistanceMeters += this.calculateDistanceMeters(p1, p2);
        }
      } else if (tleg.orderedStops && tleg.orderedStops.length >= 2) {
        for (let i = 0; i < tleg.orderedStops.length - 1; i++) {
          const s1 = tleg.orderedStops[i];
          const s2 = tleg.orderedStops[i + 1];
          transitDistanceMeters += this.calculateDistanceMeters(
            { latitude: s1.latitude, longitude: s1.longitude },
            { latitude: s2.latitude, longitude: s2.longitude }
          );
        }
      } else {
        transitDistanceMeters += this.calculateDistanceMeters(
          { latitude: tleg.boardingStop.latitude, longitude: tleg.boardingStop.longitude },
          { latitude: tleg.alightingStop.latitude, longitude: tleg.alightingStop.longitude }
        );
      }
    }

    // 4. Complete Journey Geometry & Distance
    const geometryPoints = this.extractJourneyGeometryPoints(journey);
    let journeyGeometryDistanceMeters = 0;
    for (let i = 0; i < geometryPoints.length - 1; i++) {
      journeyGeometryDistanceMeters += this.calculateDistanceMeters(geometryPoints[i], geometryPoints[i + 1]);
    }

    // 5. Total Backtracking Meters
    // Accumulated increase in straight-line distance to destination across geometry sequence
    const destination = journey.destination;
    let totalBacktrackingMeters = 0;
    for (let i = 0; i < geometryPoints.length - 1; i++) {
      const d1 = this.calculateDistanceMeters(geometryPoints[i], destination);
      const d2 = this.calculateDistanceMeters(geometryPoints[i + 1], destination);
      const diff = d2 - d1;
      if (diff > 0) {
        totalBacktrackingMeters += diff;
      }
    }

    // 6. Destination Progress Ratio
    const straightLineOriginToDestMeters = this.calculateDistanceMeters(journey.origin, destination);
    let destinationProgressRatio = 1.0;
    if (journeyGeometryDistanceMeters > 0) {
      destinationProgressRatio = Math.min(1.0, straightLineOriginToDestMeters / journeyGeometryDistanceMeters);
    }

    // 7. Initial Destination Progress Meters & Initial Direction Alignment
    // First target point is first transit boarding stop, or first non-origin geometry point
    const firstTransit = transitLegs[0];
    const initialTargetPoint: Coordinate = firstTransit
      ? { latitude: firstTransit.boardingStop.latitude, longitude: firstTransit.boardingStop.longitude }
      : geometryPoints[1] || destination;

    const distOriginToDest = straightLineOriginToDestMeters;
    const distInitialTargetToDest = this.calculateDistanceMeters(initialTargetPoint, destination);
    const initialDestinationProgressMeters = distOriginToDest - distInitialTargetToDest;

    // Vector calculations for direction alignment
    const avgLatRad = ((journey.origin.latitude + destination.latitude) / 2) * (Math.PI / 180);
    const cosAvgLat = Math.cos(avgLatRad);

    // Target vector: origin -> destination
    const targetVectorX = (destination.longitude - journey.origin.longitude) * cosAvgLat;
    const targetVectorY = destination.latitude - journey.origin.latitude;
    const targetVectorNorm = Math.sqrt(targetVectorX * targetVectorX + targetVectorY * targetVectorY);

    // Initial movement vector: origin -> initialTargetPoint
    const initialVectorX = (initialTargetPoint.longitude - journey.origin.longitude) * cosAvgLat;
    const initialVectorY = initialTargetPoint.latitude - journey.origin.latitude;
    const initialVectorNorm = Math.sqrt(initialVectorX * initialVectorX + initialVectorY * initialVectorY);

    let initialDirectionAlignment = 1.0;
    if (targetVectorNorm > 1e-9 && initialVectorNorm > 1e-9) {
      const dotProduct = targetVectorX * initialVectorX + targetVectorY * initialVectorY;
      const cosAngle = dotProduct / (targetVectorNorm * initialVectorNorm);
      initialDirectionAlignment = Math.max(-1.0, Math.min(1.0, cosAngle));
    }

    return {
      totalWalkingMeters,
      walkingBeforeFirstTransitMeters,
      walkingAfterLastTransitMeters,
      transfersCount,
      estimatedDurationMinutes,
      transitLegsCount,
      transitDistanceMeters,
      journeyGeometryDistanceMeters,
      initialDestinationProgressMeters,
      totalBacktrackingMeters,
      destinationProgressRatio,
      initialDirectionAlignment,
    };
  }
}
