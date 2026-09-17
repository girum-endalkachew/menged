import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { TransitRepository } from "@/db/repositories/transitRepository";
import { RoutingDatasetLoader } from "./routingDatasetLoader";
import { RoutingGraph } from "./routingGraph";
import { SqlTracker } from "@/db/sqlTracker";
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
    SqlTracker.resetGlobal();
    const startTime = performance.now();
    const initialSqlCount = SqlTracker.getQueryCount();

    // 0. Adversarial / input validation
    if (!this.isValidCoordinate(request?.origin) || !this.isValidCoordinate(request?.destination)) {
      return {
        journeys: [],
        diagnostics: {
          serviceCalls: 1,
          sqlQueries: SqlTracker.getQueryCount() - initialSqlCount,
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
          serviceCalls: 1,
          sqlQueries: SqlTracker.getQueryCount() - initialSqlCount,
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

    // STEP 3: Spatial candidate stop discovery (Database backed)
    const dbStartTime = performance.now();
    const candidateOriginStops = await TransitRepository.findStopsNear(
      request.origin.latitude,
      request.origin.longitude,
      originRadius
    );

    const candidateDestStops = await TransitRepository.findStopsNear(
      request.destination.latitude,
      request.destination.longitude,
      destRadius
    );

    if (candidateOriginStops.length === 0 || candidateDestStops.length === 0) {
      const dbTimeMs = performance.now() - dbStartTime;
      return {
        journeys: [],
        diagnostics: {
          serviceCalls: 1,
          sqlQueries: SqlTracker.getQueryCount() - initialSqlCount,
          candidateOriginStopsCount: candidateOriginStops.length,
          candidateDestStopsCount: candidateDestStops.length,
          candidateTransferStopsCount: 0,
          candidateTripsCount: 0,
          candidateCombinationsCount: 0,
          dbTimeMs,
          routerCpuTimeMs: performance.now() - startTime - dbTimeMs,
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

    // STEP 4-5: Obtain RoutingGraph from RoutingDatasetLoader (Application-level in-memory cache)
    const graph: RoutingGraph = await RoutingDatasetLoader.getGlobalGraph();
    const dbTimeMs = performance.now() - dbStartTime;

    const journeys: Journey[] = [];
    let combinationsEvaluated = 0;
    let candidateTripsCount = 0;
    let candidateTransferStopsCount = 0;

    const cpuStartTime = performance.now();

    // Limit candidate evaluation slices for deterministic performance
    const maxOriginCandidates = request.preferences?.maxOriginCandidates || 5;
    const maxDestCandidates = request.preferences?.maxDestCandidates || 5;

    const evalOriginStops = graph.findStopsNear(
      request.origin.latitude,
      request.origin.longitude,
      originRadius
    );

    const evalDestStops = graph.findStopsNear(
      request.destination.latitude,
      request.destination.longitude,
      destRadius
    );

    // STEP 8: DIRECT ROUTE SEARCH — 100% IN-MEMORY (ZERO SQL QUERIES)
    for (const originStop of evalOriginStops) {
      const originTimes = graph.getStopTimesForStop(originStop.id);
      if (originTimes.length === 0) continue;

      for (const destStop of evalDestStops) {
        combinationsEvaluated++;
        const destTimes = graph.getStopTimesForStop(destStop.id);
        if (destTimes.length === 0) continue;

        // Group by tripId in memory
        const destTimesByTrip = new Map<string, Array<{ sequence: number; stopId: string }>>();
        for (const dt of destTimes) {
          if (!destTimesByTrip.has(dt.tripId)) {
            destTimesByTrip.set(dt.tripId, []);
          }
          destTimesByTrip.get(dt.tripId)!.push({ sequence: dt.stopSequence, stopId: dt.stopId });
        }

        // Search for matching trip where origin sequence < destination sequence
        for (const ot of originTimes) {
          const matchingDestList = destTimesByTrip.get(ot.tripId);
          if (!matchingDestList) continue;

          for (const dtItem of matchingDestList) {
            // VERIFY INVARIANT: boardingSequence < alightingSequence
            if (ot.stopSequence >= dtItem.sequence) continue;

            const trip = graph.getTrip(ot.tripId);
            if (!trip) continue;

            const route = graph.getRoute(trip.routeId);
            if (!route) continue;

            const bStop = graph.getStop(ot.stopId) || originStop;
            const aStop = graph.getStop(dtItem.stopId) || destStop;

            const walkToBoardingMeters = this.calculateDistanceMeters(request.origin, {
              latitude: bStop.latitude,
              longitude: bStop.longitude,
            });

            const walkFromAlightingMeters = this.calculateDistanceMeters(
              { latitude: aStop.latitude, longitude: aStop.longitude },
              request.destination
            );

            const walkToBoardingLeg: WalkingLeg = {
              type: "WALK",
              from: { name: "Origin", latitude: request.origin.latitude, longitude: request.origin.longitude },
              to: {
                name: bStop.name,
                latitude: bStop.latitude,
                longitude: bStop.longitude,
                stopId: bStop.id,
              },
              distanceMeters: walkToBoardingMeters,
              estimatedMinutes: Math.ceil((walkToBoardingMeters / 1000) / (4.5 / 60)),
            };

            const rawOrderedStops = graph.getOrderedStopsForTrip(trip.id);

            // VERIFY INVARIANTS: orderedStops non-empty, monotonic, matches boarding/alighting
            const legOrderedStops = rawOrderedStops
              .filter((s) => s.stopSequence >= ot.stopSequence && s.stopSequence <= dtItem.sequence)
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
              routeId: route.id,
              routeShortName: route.shortName,
              routeLongName: route.longName,
              routeType: route.routeType,
              boardingStop: { id: bStop.id, name: bStop.name, latitude: bStop.latitude, longitude: bStop.longitude },
              alightingStop: { id: aStop.id, name: aStop.name, latitude: aStop.latitude, longitude: aStop.longitude },
              boardingSequence: ot.stopSequence,
              alightingSequence: dtItem.sequence,
              stopsCount: Math.abs(dtItem.sequence - ot.stopSequence),
              orderedStops: legOrderedStops,
            };

            const walkFromAlightingLeg: WalkingLeg = {
              type: "WALK",
              from: {
                name: aStop.name,
                latitude: aStop.latitude,
                longitude: aStop.longitude,
                stopId: aStop.id,
              },
              to: { name: "Destination", latitude: request.destination.latitude, longitude: request.destination.longitude },
              distanceMeters: walkFromAlightingMeters,
              estimatedMinutes: Math.ceil((walkFromAlightingMeters / 1000) / (4.5 / 60)),
            };

            const totalWalkMeters = walkToBoardingMeters + walkFromAlightingMeters;
            const estimatedTransitMins = transitLeg.stopsCount * 4;
            const totalEstimatedMins =
              walkToBoardingLeg.estimatedMinutes + estimatedTransitMins + walkFromAlightingLeg.estimatedMinutes;

            const score = totalWalkMeters * 0.1 + totalEstimatedMins * 1.0;

            journeys.push({
              id: `journey_direct_${route.id}_${bStop.id}_${aStop.id}`,
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
            break; // Found best direct route for this trip
          }
        }
      }
    }

    // STEP 9-10: ONE-TRANSFER ROUTE SEARCH — 100% IN-MEMORY (ZERO SQL QUERIES)
    if (journeys.length < 2 && maxTransfers >= 1) {
      let transferFound = false;

      // Gather candidate trips serving origin stops & dest stops
      const originTripIds = new Set<string>();
      for (const s of evalOriginStops) {
        graph.getStopTimesForStop(s.id).forEach((st) => originTripIds.add(st.tripId));
      }

      const destTripIds = new Set<string>();
      for (const s of evalDestStops) {
        graph.getStopTimesForStop(s.id).forEach((st) => destTripIds.add(st.tripId));
      }

      const evalOriginTrips = Array.from(originTripIds).slice(0, 15);
      const evalDestTrips = Array.from(destTripIds).slice(0, 15);
      candidateTripsCount = evalOriginTrips.length + evalDestTrips.length;

      for (const oTripId of evalOriginTrips) {
        if (transferFound) break;
        const oTrip = graph.getTrip(oTripId);
        if (!oTrip) continue;

        const oRoute = graph.getRoute(oTrip.routeId);
        if (!oRoute) continue;

        const oTripStops = graph.getOrderedStopsForTrip(oTripId);
        if (oTripStops.length === 0) continue;

        for (const dTripId of evalDestTrips) {
          if (transferFound) break;
          const dTrip = graph.getTrip(dTripId);
          if (!dTrip) continue;

          const dRoute = graph.getRoute(dTrip.routeId);
          if (!dRoute) continue;

          if (oRoute.id === dRoute.id) continue; // Skip same route

          const dTripStops = graph.getOrderedStopsForTrip(dTripId);
          if (dTripStops.length === 0) continue;

          // STEP 12 / PART 5: Multiple stop occurrences preservation
          const validOriginOccurrences = oTripStops.filter((s) =>
            evalOriginStops.some(
              (cand) =>
                cand.id === s.stop.id ||
                this.calculateDistanceMeters(s.stop, { latitude: cand.latitude, longitude: cand.longitude }) <= 250
            )
          );

          const validDestOccurrences = dTripStops.filter((s) =>
            evalDestStops.some(
              (cand) =>
                cand.id === s.stop.id ||
                this.calculateDistanceMeters(s.stop, { latitude: cand.latitude, longitude: cand.longitude }) <= 250
            )
          );

          if (validOriginOccurrences.length === 0 || validDestOccurrences.length === 0) continue;

          // Search for transfer stop candidate pair in memory
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
              if (!validOriginOcc) continue;

              // 2. Check Leg 2 directionality: dStopItem.stopSequence < validDestOcc.stopSequence
              const validDestOcc = validDestOccurrences.find(
                (dOcc) => dStopItem.stopSequence < dOcc.stopSequence
              );
              if (!validDestOcc) continue;

              const originStop =
                evalOriginStops.find((s) => s.id === validOriginOcc.stop.id) || evalOriginStops[0];
              const destStop =
                evalDestStops.find((s) => s.id === validDestOcc.stop.id) || evalDestStops[0];

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
                routeId: oRoute.id,
                routeShortName: oRoute.shortName,
                routeLongName: oRoute.longName,
                routeType: oRoute.routeType,
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
                routeId: dRoute.id,
                routeShortName: dRoute.shortName,
                routeLongName: dRoute.longName,
                routeType: dRoute.routeType,
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

    const routerCpuTimeMs = performance.now() - cpuStartTime;
    const totalRequestTimeMs = performance.now() - startTime;
    const sqlQueriesExecuted = SqlTracker.getQueryCount() - initialSqlCount;

    return {
      journeys: uniqueJourneys,
      diagnostics: {
        serviceCalls: 1,
        sqlQueries: sqlQueriesExecuted,
        candidateOriginStopsCount: candidateOriginStops.length,
        candidateDestStopsCount: candidateDestStops.length,
        candidateTransferStopsCount,
        candidateTripsCount,
        candidateCombinationsCount: combinationsEvaluated,
        dbTimeMs,
        routerCpuTimeMs,
        totalRequestTimeMs,
      },
    };
  }
}
