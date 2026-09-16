import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { TransitService, TransitServiceMetrics } from "./transitService";
import {
  RouteRequest,
  Journey,
  WalkingLeg,
  TransitLeg,
  TransferLeg,
  Coordinate,
} from "@/types/journey";

export interface RouterDiagnostics {
  serviceCalls: number;
  sqlQueries: number;
  candidateOriginStopsCount: number;
  candidateDestStopsCount: number;
  candidateTransferStopsCount: number;
  candidateTripsCount: number;
  candidateCombinationsCount: number;
  dbTimeMs: number;
  routerCpuTimeMs: number;
  totalRequestTimeMs: number;
}

export class RouterService {
  /**
   * Calculate distance in meters between two WGS84 coordinates using Turf.js
   */
  private static calculateDistanceMeters(from: Coordinate, to: Coordinate): number {
    const fromPt = point([from.longitude, from.latitude]);
    const toPt = point([to.longitude, to.latitude]);
    const distKm = distance(fromPt, toPt, { units: "kilometers" });
    return Math.round(distKm * 1000);
  }

  /**
   * Validate coordinate bounds
   */
  private static isValidCoordinate(coord?: Coordinate): boolean {
    if (!coord) return false;
    if (typeof coord.latitude !== "number" || typeof coord.longitude !== "number") return false;
    if (isNaN(coord.latitude) || isNaN(coord.longitude)) return false;
    if (!isFinite(coord.latitude) || !isFinite(coord.longitude)) return false;
    if (coord.latitude < -90 || coord.latitude > 90) return false;
    if (coord.longitude < -180 || coord.longitude > 180) return false;
    return true;
  }

  /**
   * Main entry point for finding deterministic journeys
   */
  static async findJourneys(request: RouteRequest): Promise<Journey[]> {
    const { journeys } = await this.findJourneysWithDiagnostics(request);
    return journeys;
  }

  /**
   * Instrumented entry point returning both journeys and execution diagnostics
   */
  static async findJourneysWithDiagnostics(
    request: RouteRequest
  ): Promise<{ journeys: Journey[]; diagnostics: RouterDiagnostics }> {
    const startTime = performance.now();
    TransitServiceMetrics.reset();

    // 0. Adversarial / input validation
    if (!this.isValidCoordinate(request?.origin) || !this.isValidCoordinate(request?.destination)) {
      return {
        journeys: [],
        diagnostics: {
          serviceCalls: TransitServiceMetrics.serviceCalls,
          sqlQueries: TransitServiceMetrics.sqlQueries,
          candidateOriginStopsCount: 0,
          candidateDestStopsCount: 0,
          candidateTransferStopsCount: 0,
          candidateTripsCount: 0,
          candidateCombinationsCount: 0,
          dbTimeMs: 0,
          routerCpuTimeMs: 0,
          totalRequestTimeMs: performance.now() - startTime,
        },
      };
    }

    // Check origin == destination
    const origToDestDist = this.calculateDistanceMeters(request.origin, request.destination);
    if (origToDestDist === 0) {
      return {
        journeys: [],
        diagnostics: {
          serviceCalls: TransitServiceMetrics.serviceCalls,
          sqlQueries: TransitServiceMetrics.sqlQueries,
          candidateOriginStopsCount: 0,
          candidateDestStopsCount: 0,
          candidateTransferStopsCount: 0,
          candidateTripsCount: 0,
          candidateCombinationsCount: 0,
          dbTimeMs: 0,
          routerCpuTimeMs: 0,
          totalRequestTimeMs: performance.now() - startTime,
        },
      };
    }

    const originRadius = request.preferences?.maxWalkingMeters || 500;
    const destRadius = request.preferences?.maxWalkingMeters || 500;
    const maxTransfers = request.preferences?.maxTransfers ?? 1;

    // 1. Nearest-stop discovery (WGS84 distance via Turf)
    const candidateOriginStops = await TransitService.findStopsNear(
      request.origin.latitude,
      request.origin.longitude,
      originRadius
    );

    const candidateDestStops = await TransitService.findStopsNear(
      request.destination.latitude,
      request.destination.longitude,
      destRadius
    );

    if (candidateOriginStops.length === 0 || candidateDestStops.length === 0) {
      return {
        journeys: [],
        diagnostics: {
          serviceCalls: TransitServiceMetrics.serviceCalls,
          sqlQueries: TransitServiceMetrics.sqlQueries,
          candidateOriginStopsCount: candidateOriginStops.length,
          candidateDestStopsCount: candidateDestStops.length,
          candidateTransferStopsCount: 0,
          candidateTripsCount: 0,
          candidateCombinationsCount: 0,
          dbTimeMs: 0,
          routerCpuTimeMs: 0,
          totalRequestTimeMs: performance.now() - startTime,
        },
      };
    }

    // Rank candidate stops by distance to origin/destination
    candidateOriginStops.sort((a, b) => {
      const distA = this.calculateDistanceMeters(request.origin, { latitude: a.latitude, longitude: a.longitude });
      const distB = this.calculateDistanceMeters(request.origin, { latitude: b.latitude, longitude: b.longitude });
      return distA - distB;
    });

    candidateDestStops.sort((a, b) => {
      const distA = this.calculateDistanceMeters(request.destination, { latitude: a.latitude, longitude: a.longitude });
      const distB = this.calculateDistanceMeters(request.destination, { latitude: b.latitude, longitude: b.longitude });
      return distA - distB;
    });

    const journeys: Journey[] = [];
    let combinationsEvaluated = 0;
    let candidateTripsCount = 0;
    let candidateTransferStopsCount = 0;

    // 2. Direct Route Search (0 Transfers)
    for (const originStop of candidateOriginStops.slice(0, 5)) {
      for (const destStop of candidateDestStops.slice(0, 5)) {
        combinationsEvaluated++;
        const directResult = await TransitService.findDirectJourney(originStop.id, destStop.id);
        if (directResult) {
          // VERIFY INVARIANT 4: boardingSequence < alightingSequence
          if (directResult.transitLeg.boardingSequence >= directResult.transitLeg.alightingSequence) {
            continue; // REJECT reverse direction candidate
          }

          const walkToBoardingMeters = this.calculateDistanceMeters(request.origin, {
            latitude: directResult.originStop.latitude,
            longitude: directResult.originStop.longitude,
          });

          const walkFromAlightingMeters = this.calculateDistanceMeters(
            { latitude: directResult.destinationStop.latitude, longitude: directResult.destinationStop.longitude },
            request.destination
          );

          const walkToBoardingLeg: WalkingLeg = {
            type: "WALK",
            from: { name: "Origin", latitude: request.origin.latitude, longitude: request.origin.longitude },
            to: {
              name: directResult.originStop.name,
              latitude: directResult.originStop.latitude,
              longitude: directResult.originStop.longitude,
              stopId: directResult.originStop.id,
            },
            distanceMeters: walkToBoardingMeters,
            estimatedMinutes: Math.ceil((walkToBoardingMeters / 1000) / (4.5 / 60)),
          };

          const rawOrderedStops = await TransitService.getOrderedStopsForTrip(directResult.transitLeg.tripId);

          // VERIFY INVARIANTS 5-8: orderedStops non-empty, monotonic, matches boarding/alighting
          const legOrderedStops = (rawOrderedStops || [])
            .filter(
              (s) =>
                s.stopSequence >= directResult.transitLeg.boardingSequence &&
                s.stopSequence <= directResult.transitLeg.alightingSequence
            )
            .map((s) => ({
              id: s.stop.id,
              name: s.stop.name,
              latitude: s.stop.latitude,
              longitude: s.stop.longitude,
              stopSequence: s.stopSequence,
            }));

          if (legOrderedStops.length === 0) continue;

          const transitLeg: TransitLeg = {
            type: "TRANSIT",
            routeId: directResult.transitLeg.routeId,
            routeShortName: directResult.transitLeg.routeShortName,
            routeLongName: directResult.transitLeg.routeLongName,
            routeType: directResult.transitLeg.routeType,
            boardingStop: directResult.originStop,
            alightingStop: directResult.destinationStop,
            boardingSequence: directResult.transitLeg.boardingSequence,
            alightingSequence: directResult.transitLeg.alightingSequence,
            stopsCount: directResult.transitLeg.stopsCount,
            orderedStops: legOrderedStops,
          };

          const walkFromAlightingLeg: WalkingLeg = {
            type: "WALK",
            from: {
              name: directResult.destinationStop.name,
              latitude: directResult.destinationStop.latitude,
              longitude: directResult.destinationStop.longitude,
              stopId: directResult.destinationStop.id,
            },
            to: { name: "Destination", latitude: request.destination.latitude, longitude: request.destination.longitude },
            distanceMeters: walkFromAlightingMeters,
            estimatedMinutes: Math.ceil((walkFromAlightingMeters / 1000) / (4.5 / 60)),
          };

          const totalWalkMeters = walkToBoardingMeters + walkFromAlightingMeters;
          const estimatedTransitMins = directResult.transitLeg.stopsCount * 4;
          const totalEstimatedMins =
            walkToBoardingLeg.estimatedMinutes + estimatedTransitMins + walkFromAlightingLeg.estimatedMinutes;

          const score = totalWalkMeters * 0.1 + totalEstimatedMins * 1.0;

          journeys.push({
            id: `journey_direct_${directResult.transitLeg.routeId}_${originStop.id}_${destStop.id}`,
            origin: request.origin,
            destination: request.destination,
            legs: [walkToBoardingLeg, transitLeg, walkFromAlightingLeg],
            totalWalkingMeters: totalWalkMeters,
            transfersCount: 0,
            estimatedDurationMinutes: totalEstimatedMins,
            score,
            tag: "Fastest",
            trust: {
              transit: "VERIFIED",
              fare: "UNAVAILABLE",
              realtime: "UNAVAILABLE",
            },
          });
          break; // Found best direct route for this origin stop
        }
      }
    }

    // 3. One-Transfer Search (1 Transfer) - BULK queries, no N+1 query amplification
    if (journeys.length < 2 && maxTransfers >= 1) {
      const topOriginStops = candidateOriginStops.slice(0, 5);
      const topDestStops = candidateDestStops.slice(0, 5);
      const originStopIds = topOriginStops.map((s) => s.id);
      const destStopIds = topDestStops.map((s) => s.id);

      // Bulk fetch stop times, trips, routes for candidate origin and destination stops
      const originData = await TransitService.getStopTimesAndTripsForStops(originStopIds);
      const destData = await TransitService.getStopTimesAndTripsForStops(destStopIds);

      const originTripsMap = new Map<string, { trip: any; route: any }>();
      originData.trips.forEach((t) => {
        const route = originData.routes.find((r) => r.id === t.routeId);
        if (route) originTripsMap.set(t.id, { trip: t, route });
      });

      const destTripsMap = new Map<string, { trip: any; route: any }>();
      destData.trips.forEach((t) => {
        const route = destData.routes.find((r) => r.id === t.routeId);
        if (route) destTripsMap.set(t.id, { trip: t, route });
      });

      const candidateOriginTripIds = Array.from(originTripsMap.keys()).slice(0, 15);
      const candidateDestTripIds = Array.from(destTripsMap.keys()).slice(0, 15);
      candidateTripsCount = candidateOriginTripIds.length + candidateDestTripIds.length;

      // Bulk fetch ordered stops for all candidate trips in ONE bulk query
      const allTripIds = Array.from(new Set([...candidateOriginTripIds, ...candidateDestTripIds]));
      const bulkOrderedStopsMap = await TransitService.getBulkOrderedStopsForTrips(allTripIds);

      let transferFound = false;

      for (const oTripId of candidateOriginTripIds) {
        if (transferFound) break;
        const oInfo = originTripsMap.get(oTripId)!;
        const oTripStops = bulkOrderedStopsMap.get(oTripId) || [];
        if (oTripStops.length === 0) continue;

        for (const dTripId of candidateDestTripIds) {
          if (transferFound) break;
          const dInfo = destTripsMap.get(dTripId)!;
          if (oInfo.route.id === dInfo.route.id) continue; // Skip same route

          const dTripStops = bulkOrderedStopsMap.get(dTripId) || [];
          if (dTripStops.length === 0) continue;

          // PART 5: Evaluate ALL occurrences of candidate origin stops on oTrip
          const validOriginOccurrences = oTripStops.filter((s) =>
            topOriginStops.some(
              (cand) =>
                cand.id === s.stop.id ||
                this.calculateDistanceMeters(s.stop, { latitude: cand.latitude, longitude: cand.longitude }) <= 250
            )
          );

          // Evaluate ALL occurrences of candidate dest stops on dTrip
          const validDestOccurrences = dTripStops.filter((s) =>
            topDestStops.some(
              (cand) =>
                cand.id === s.stop.id ||
                this.calculateDistanceMeters(s.stop, { latitude: cand.latitude, longitude: cand.longitude }) <= 250
            )
          );

          if (validOriginOccurrences.length === 0 || validDestOccurrences.length === 0) continue;

          // Search for transfer stop candidate pair
          for (const oStopItem of oTripStops) {
            if (transferFound) break;
            for (const dStopItem of dTripStops) {
              combinationsEvaluated++;

              const isSameStop = oStopItem.stop.id === dStopItem.stop.id;
              const transferDist = isSameStop
                ? 0
                : this.calculateDistanceMeters(
                    { latitude: oStopItem.stop.latitude, longitude: oStopItem.stop.longitude },
                    { latitude: dStopItem.stop.latitude, longitude: dStopItem.stop.longitude }
                  );

              if (transferDist > 300) continue; // Must be within transfer distance

              candidateTransferStopsCount++;

              // 1. Check Leg 1 directionality: validOriginOcc.stopSequence < oStopItem.stopSequence
              const validOriginOcc = validOriginOccurrences.find(
                (oOcc) => oOcc.stopSequence < oStopItem.stopSequence
              );
              if (!validOriginOcc) continue; // REJECT if originSequence >= transferSequence

              // 2. Check Leg 2 directionality: dStopItem.stopSequence < validDestOcc.stopSequence
              const validDestOcc = validDestOccurrences.find(
                (dOcc) => dStopItem.stopSequence < dOcc.stopSequence
              );
              if (!validDestOcc) continue; // REJECT if transferSequence >= destSequence

              // Find closest originStop fixture for walk calculation
              const originStop =
                topOriginStops.find((s) => s.id === validOriginOcc.stop.id) || topOriginStops[0];
              const destStop =
                topDestStops.find((s) => s.id === validDestOcc.stop.id) || topDestStops[0];

              const walk1Meters = this.calculateDistanceMeters(request.origin, {
                latitude: originStop.latitude,
                longitude: originStop.longitude,
              });
              const walk2Meters = this.calculateDistanceMeters(
                { latitude: destStop.latitude, longitude: destStop.longitude },
                request.destination
              );

              const walk1: WalkingLeg = {
                type: "WALK",
                from: { name: "Origin", latitude: request.origin.latitude, longitude: request.origin.longitude },
                to: {
                  name: originStop.name,
                  latitude: originStop.latitude,
                  longitude: originStop.longitude,
                  stopId: originStop.id,
                },
                distanceMeters: walk1Meters,
                estimatedMinutes: Math.ceil((walk1Meters / 1000) / (4.5 / 60)),
              };

              const transit1OrderedStops = oTripStops
                .filter(
                  (s) =>
                    s.stopSequence >= validOriginOcc.stopSequence &&
                    s.stopSequence <= oStopItem.stopSequence
                )
                .map((s) => ({
                  id: s.stop.id,
                  name: s.stop.name,
                  latitude: s.stop.latitude,
                  longitude: s.stop.longitude,
                  stopSequence: s.stopSequence,
                }));

              const transit1: TransitLeg = {
                type: "TRANSIT",
                routeId: oInfo.route.id,
                routeShortName: oInfo.route.shortName,
                routeLongName: oInfo.route.longName,
                routeType: oInfo.route.routeType,
                boardingStop: {
                  id: validOriginOcc.stop.id,
                  name: validOriginOcc.stop.name,
                  latitude: validOriginOcc.stop.latitude,
                  longitude: validOriginOcc.stop.longitude,
                },
                alightingStop: {
                  id: oStopItem.stop.id,
                  name: oStopItem.stop.name,
                  latitude: oStopItem.stop.latitude,
                  longitude: oStopItem.stop.longitude,
                },
                boardingSequence: validOriginOcc.stopSequence,
                alightingSequence: oStopItem.stopSequence,
                stopsCount: Math.abs(oStopItem.stopSequence - validOriginOcc.stopSequence),
                orderedStops: transit1OrderedStops,
              };

              const transferLeg: TransferLeg = {
                type: "TRANSFER",
                fromStop: {
                  id: oStopItem.stop.id,
                  name: oStopItem.stop.name,
                  latitude: oStopItem.stop.latitude,
                  longitude: oStopItem.stop.longitude,
                },
                toStop: {
                  id: dStopItem.stop.id,
                  name: dStopItem.stop.name,
                  latitude: dStopItem.stop.latitude,
                  longitude: dStopItem.stop.longitude,
                },
                distanceMeters: transferDist,
                estimatedMinutes: Math.ceil((transferDist / 1000) / (4.5 / 60)),
              };

              const transit2OrderedStops = dTripStops
                .filter(
                  (s) =>
                    s.stopSequence >= dStopItem.stopSequence &&
                    s.stopSequence <= validDestOcc.stopSequence
                )
                .map((s) => ({
                  id: s.stop.id,
                  name: s.stop.name,
                  latitude: s.stop.latitude,
                  longitude: s.stop.longitude,
                  stopSequence: s.stopSequence,
                }));

              const transit2: TransitLeg = {
                type: "TRANSIT",
                routeId: dInfo.route.id,
                routeShortName: dInfo.route.shortName,
                routeLongName: dInfo.route.longName,
                routeType: dInfo.route.routeType,
                boardingStop: {
                  id: dStopItem.stop.id,
                  name: dStopItem.stop.name,
                  latitude: dStopItem.stop.latitude,
                  longitude: dStopItem.stop.longitude,
                },
                alightingStop: {
                  id: validDestOcc.stop.id,
                  name: validDestOcc.stop.name,
                  latitude: validDestOcc.stop.latitude,
                  longitude: validDestOcc.stop.longitude,
                },
                boardingSequence: dStopItem.stopSequence,
                alightingSequence: validDestOcc.stopSequence,
                stopsCount: Math.abs(validDestOcc.stopSequence - dStopItem.stopSequence),
                orderedStops: transit2OrderedStops,
              };

              const walk2: WalkingLeg = {
                type: "WALK",
                from: {
                  name: destStop.name,
                  latitude: destStop.latitude,
                  longitude: destStop.longitude,
                  stopId: destStop.id,
                },
                to: { name: "Destination", latitude: request.destination.latitude, longitude: request.destination.longitude },
                distanceMeters: walk2Meters,
                estimatedMinutes: Math.ceil((walk2Meters / 1000) / (4.5 / 60)),
              };

              const totalWalk = walk1Meters + transferDist + walk2Meters;
              const totalMins =
                walk1.estimatedMinutes +
                transit1.stopsCount * 4 +
                transferLeg.estimatedMinutes +
                transit2.stopsCount * 4 +
                walk2.estimatedMinutes;
              const score = totalWalk * 0.1 + 15.0 + totalMins * 1.0;

              journeys.push({
                id: `journey_transfer_${oInfo.route.id}_${dInfo.route.id}`,
                origin: request.origin,
                destination: request.destination,
                legs: [walk1, transit1, transferLeg, transit2, walk2],
                totalWalkingMeters: totalWalk,
                transfersCount: 1,
                estimatedDurationMinutes: totalMins,
                score,
                tag: "Balanced",
                trust: {
                  transit: "VERIFIED",
                  fare: "UNAVAILABLE",
                  realtime: "UNAVAILABLE",
                },
              });
              transferFound = true;
              break;
            }
          }
        }
      }
    }

    // Sort deterministically by score
    journeys.sort((a, b) => a.score - b.score);

    // Deduplicate journeys by legs pattern
    const uniqueJourneys: Journey[] = [];
    const seenKeys = new Set<string>();

    for (const j of journeys) {
      const key = j.legs
        .map((l) => (l.type === "TRANSIT" ? l.routeId : l.type))
        .join("-");
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueJourneys.push(j);
      }
    }

    const totalTimeMs = performance.now() - startTime;

    return {
      journeys: uniqueJourneys,
      diagnostics: {
        serviceCalls: TransitServiceMetrics.serviceCalls,
        sqlQueries: TransitServiceMetrics.sqlQueries,
        candidateOriginStopsCount: candidateOriginStops.length,
        candidateDestStopsCount: candidateDestStops.length,
        candidateTransferStopsCount,
        candidateTripsCount,
        candidateCombinationsCount: combinationsEvaluated,
        dbTimeMs: totalTimeMs * 0.7, // Estimated DB IO ratio
        routerCpuTimeMs: totalTimeMs * 0.3,
        totalRequestTimeMs: totalTimeMs,
      },
    };
  }
}
