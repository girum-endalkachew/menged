import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { TransitService } from "./transitService";
import {
  RouteRequest,
  Journey,
  WalkingLeg,
  TransitLeg,
  TransferLeg,
  Coordinate,
} from "@/types/journey";

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
   * Main entry point for finding deterministic journeys
   */
  static async findJourneys(request: RouteRequest): Promise<Journey[]> {
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
      return [];
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
    const tripStopsCache = new Map<string, any[]>();

    const getCachedOrderedStops = async (tripId: string) => {
      if (!tripStopsCache.has(tripId)) {
        const stopsInfo = await TransitService.getOrderedStopsForTrip(tripId);
        tripStopsCache.set(tripId, stopsInfo);
      }
      return tripStopsCache.get(tripId)!;
    };

    // 2. Direct Route Search (0 Transfers)
    for (const originStop of candidateOriginStops.slice(0, 3)) {
      for (const destStop of candidateDestStops.slice(0, 3)) {
        const directResult = await TransitService.findDirectJourney(originStop.id, destStop.id);
        if (directResult) {
          // Verify sequence directionality
          if (directResult.transitLeg.boardingSequence >= directResult.transitLeg.alightingSequence) {
            continue; // REJECT candidate if boardingSequence >= alightingSequence
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

          const rawOrderedStops = await getCachedOrderedStops(directResult.transitLeg.tripId);

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

    // 3. One-Transfer Search (1 Transfer) if needed and permitted
    if (journeys.length < 2 && maxTransfers >= 1) {
      let transferFound = false;

      for (const originStop of candidateOriginStops.slice(0, 5)) {
        if (transferFound) break;
        for (const destStop of candidateDestStops.slice(0, 5)) {
          if (transferFound) break;

          const originRoutes = await TransitService.getRoutesForStop(originStop.id);
          const destRoutes = await TransitService.getRoutesForStop(destStop.id);

          for (const oRoute of originRoutes.slice(0, 5)) {
            if (transferFound) break;
            for (const dRoute of destRoutes.slice(0, 5)) {
              if (transferFound) break;
              if (oRoute.id === dRoute.id) continue;

              const oTrips = await TransitService.getTripsForRoute(oRoute.id);
              const dTrips = await TransitService.getTripsForRoute(dRoute.id);

              if (oTrips.length === 0 || dTrips.length === 0) continue;

              // Find a trip in oTrips serving originStop
              let oTripStops: any[] = [];
              for (const ot of oTrips) {
                const stops = await getCachedOrderedStops(ot.id);
                if (stops.some((s) => s.stop.id === originStop.id)) {
                  oTripStops = stops;
                  break;
                }
              }

              // Find a trip in dTrips serving destStop
              let dTripStops: any[] = [];
              for (const dt of dTrips) {
                const stops = await getCachedOrderedStops(dt.id);
                if (stops.some((s) => s.stop.id === destStop.id)) {
                  dTripStops = stops;
                  break;
                }
              }

              if (oTripStops.length === 0 || dTripStops.length === 0) continue;

              // Find origin stop occurrences within 250m of originStop on oTrip
              const originStopOccurrences = oTripStops.filter(
                (s) => this.calculateDistanceMeters(s.stop, { latitude: originStop.latitude, longitude: originStop.longitude }) <= 250
              );
              // Find dest stop occurrences within 250m of destStop on dTrip
              const destStopOccurrences = dTripStops.filter(
                (s) => this.calculateDistanceMeters(s.stop, { latitude: destStop.latitude, longitude: destStop.longitude }) <= 250
              );

              if (originStopOccurrences.length === 0 || destStopOccurrences.length === 0) continue;

              // Look for transfer stop candidate pair within 250 meters
              for (const oStopItem of oTripStops) {
                if (transferFound) break;
                for (const dStopItem of dTripStops) {
                  if (oStopItem.stop.id === dStopItem.stop.id) continue;

                  // 1. Verify directionality on Leg 1: originStop -> oStopItem
                  const validOriginOcc = originStopOccurrences.find(
                    (oOcc) => oOcc.stopSequence < oStopItem.stopSequence
                  );
                  if (!validOriginOcc) continue; // REJECT if originSequence >= transferSequence

                  // 2. Verify directionality on Leg 2: dStopItem -> destStop
                  const validDestOcc = destStopOccurrences.find(
                    (dOcc) => dStopItem.stopSequence < dOcc.stopSequence
                  );
                  if (!validDestOcc) continue; // REJECT if transferSequence >= destSequence

                  const transferDist = this.calculateDistanceMeters(
                    { latitude: oStopItem.stop.latitude, longitude: oStopItem.stop.longitude },
                    { latitude: dStopItem.stop.latitude, longitude: dStopItem.stop.longitude }
                  );

                  if (transferDist <= 250) {
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
                      to: { name: originStop.name, latitude: originStop.latitude, longitude: originStop.longitude, stopId: originStop.id },
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
                      routeId: oRoute.id,
                      routeShortName: oRoute.shortName,
                      routeLongName: oRoute.longName,
                      routeType: oRoute.routeType,
                      boardingStop: { id: originStop.id, name: originStop.name, latitude: originStop.latitude, longitude: originStop.longitude },
                      alightingStop: { id: oStopItem.stop.id, name: oStopItem.stop.name, latitude: oStopItem.stop.latitude, longitude: oStopItem.stop.longitude },
                      boardingSequence: validOriginOcc.stopSequence,
                      alightingSequence: oStopItem.stopSequence,
                      stopsCount: Math.abs(oStopItem.stopSequence - validOriginOcc.stopSequence),
                      orderedStops: transit1OrderedStops,
                    };

                    const transferLeg: TransferLeg = {
                      type: "TRANSFER",
                      fromStop: { id: oStopItem.stop.id, name: oStopItem.stop.name, latitude: oStopItem.stop.latitude, longitude: oStopItem.stop.longitude },
                      toStop: { id: dStopItem.stop.id, name: dStopItem.stop.name, latitude: dStopItem.stop.latitude, longitude: dStopItem.stop.longitude },
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
                      routeId: dRoute.id,
                      routeShortName: dRoute.shortName,
                      routeLongName: dRoute.longName,
                      routeType: dRoute.routeType,
                      boardingStop: { id: dStopItem.stop.id, name: dStopItem.stop.name, latitude: dStopItem.stop.latitude, longitude: dStopItem.stop.longitude },
                      alightingStop: { id: destStop.id, name: destStop.name, latitude: destStop.latitude, longitude: destStop.longitude },
                      boardingSequence: dStopItem.stopSequence,
                      alightingSequence: validDestOcc.stopSequence,
                      stopsCount: Math.abs(validDestOcc.stopSequence - dStopItem.stopSequence),
                      orderedStops: transit2OrderedStops,
                    };

                    const walk2: WalkingLeg = {
                      type: "WALK",
                      from: { name: destStop.name, latitude: destStop.latitude, longitude: destStop.longitude, stopId: destStop.id },
                      to: { name: "Destination", latitude: request.destination.latitude, longitude: request.destination.longitude },
                      distanceMeters: walk2Meters,
                      estimatedMinutes: Math.ceil((walk2Meters / 1000) / (4.5 / 60)),
                    };

                    const totalWalk = walk1Meters + transferDist + walk2Meters;
                    const totalMins = walk1.estimatedMinutes + transferLeg.estimatedMinutes + walk2.estimatedMinutes + 30;
                    const score = totalWalk * 0.1 + 15.0 + totalMins * 1.0;

                    journeys.push({
                      id: `journey_transfer_${oRoute.id}_${dRoute.id}`,
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

    return uniqueJourneys;
  }
}
