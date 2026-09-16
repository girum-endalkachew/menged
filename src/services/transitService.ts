import { db } from "@/db";
import { stops, routes, trips, stopTimes } from "@/db/schema";
import { eq, inArray, like, sql, and, between } from "drizzle-orm";

export interface TransitStopData {
  id: string;
  name: string;
  nameAmharic?: string | null;
  latitude: number;
  longitude: number;
}

export interface TransitRouteData {
  id: string;
  shortName: string | null;
  longName: string | null;
  routeType: number;
  colorHex?: string | null;
}

export interface DirectJourneyResult {
  originStop: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  destinationStop: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  transitLeg: {
    tripId: string;
    routeId: string;
    routeShortName: string | null;
    routeLongName: string | null;
    routeType: number;
    boardingStopId: string;
    alightingStopId: string;
    boardingSequence: number;
    alightingSequence: number;
    stopsCount: number;
  };
  trust: {
    transitDataStatus: "VERIFIED";
    fareDataStatus: "ESTIMATED" | "UNAVAILABLE";
    realtimeDataStatus: "UNAVAILABLE";
  };
}

export class TransitServiceMetrics {
  static serviceCalls = 0;
  static sqlQueries = 0;

  static reset() {
    this.serviceCalls = 0;
    this.sqlQueries = 0;
  }
}

export class TransitService {
  /**
   * Find stops matching a name query (case-insensitive) directly from PostgreSQL
   */
  static async findStopByName(name: string): Promise<TransitStopData[]> {
    TransitServiceMetrics.serviceCalls++;
    try {
      TransitServiceMetrics.sqlQueries++;
      return await db
        .select()
        .from(stops)
        .where(like(stops.name, `%${name}%`))
        .limit(20);
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to query stops by name: ${err?.message}`);
    }
  }

  /**
   * Find stops within a given radius in meters directly from PostgreSQL
   */
  static async findStopsNear(lat: number, lon: number, radiusMeters = 500): Promise<TransitStopData[]> {
    TransitServiceMetrics.serviceCalls++;
    const degreesPerMeter = 1 / 111000;
    const maxDegreeDelta = radiusMeters * degreesPerMeter;

    const minLat = lat - maxDegreeDelta;
    const maxLat = lat + maxDegreeDelta;
    const minLon = lon - maxDegreeDelta;
    const maxLon = lon + maxDegreeDelta;

    try {
      TransitServiceMetrics.sqlQueries++;
      const candidateStops = await db
        .select()
        .from(stops)
        .where(
          and(
            between(stops.latitude, minLat, maxLat),
            between(stops.longitude, minLon, maxLon)
          )
        );

      return candidateStops.filter((s) => {
        const dLat = Math.abs(s.latitude - lat);
        const dLon = Math.abs(s.longitude - lon);
        return Math.sqrt(dLat * dLat + dLon * dLon) <= maxDegreeDelta;
      });
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to query nearby stops: ${err?.message}`);
    }
  }

  /**
   * Get all routes serving a specific stop directly from PostgreSQL
   */
  static async getRoutesForStop(stopId: string): Promise<TransitRouteData[]> {
    TransitServiceMetrics.serviceCalls++;
    try {
      TransitServiceMetrics.sqlQueries++;
      const times = await db.select().from(stopTimes).where(eq(stopTimes.stopId, stopId));
      const tripIds = times.map((t) => t.tripId);
      if (tripIds.length === 0) return [];

      TransitServiceMetrics.sqlQueries++;
      const matchedTrips = await db.select().from(trips).where(inArray(trips.id, tripIds));
      const routeIds = Array.from(new Set(matchedTrips.map((t) => t.routeId)));
      if (routeIds.length === 0) return [];

      TransitServiceMetrics.sqlQueries++;
      return await db.select().from(routes).where(inArray(routes.id, routeIds));
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to query routes for stop: ${err?.message}`);
    }
  }

  /**
   * Get trips for a route directly from PostgreSQL
   */
  static async getTripsForRoute(routeId: string) {
    TransitServiceMetrics.serviceCalls++;
    try {
      TransitServiceMetrics.sqlQueries++;
      return await db.select().from(trips).where(eq(trips.routeId, routeId));
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to query trips for route: ${err?.message}`);
    }
  }

  /**
   * Get ordered stops for a specific trip directly from PostgreSQL
   */
  static async getOrderedStopsForTrip(tripId: string) {
    TransitServiceMetrics.serviceCalls++;
    try {
      TransitServiceMetrics.sqlQueries++;
      const times = await db
        .select()
        .from(stopTimes)
        .where(eq(stopTimes.tripId, tripId));

      if (times.length === 0) return [];

      times.sort((a, b) => a.stopSequence - b.stopSequence);
      const stopIds = Array.from(new Set(times.map((t) => t.stopId)));
      TransitServiceMetrics.sqlQueries++;
      const matchedStops = await db.select().from(stops).where(inArray(stops.id, stopIds));
      const stopMap = new Map(matchedStops.map((s) => [s.id, s]));

      return times.map((t) => ({
        stopSequence: t.stopSequence,
        arrivalTime: t.arrivalTime,
        departureTime: t.departureTime,
        stop: stopMap.get(t.stopId) || { id: t.stopId, name: t.stopId, latitude: 0, longitude: 0 },
      }));
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to query ordered stops for trip: ${err?.message}`);
    }
  }

  /**
   * Bulk-fetch ordered stops for multiple trips to avoid N+1 query amplification
   */
  static async getBulkOrderedStopsForTrips(tripIds: string[]) {
    TransitServiceMetrics.serviceCalls++;
    if (tripIds.length === 0) return new Map();

    try {
      TransitServiceMetrics.sqlQueries++;
      const times = await db.select().from(stopTimes).where(inArray(stopTimes.tripId, tripIds));
      if (times.length === 0) return new Map();

      const stopIds = Array.from(new Set(times.map((t) => t.stopId)));
      TransitServiceMetrics.sqlQueries++;
      const matchedStops = await db.select().from(stops).where(inArray(stops.id, stopIds));
      const stopMap = new Map(matchedStops.map((s) => [s.id, s]));

      const resultMap = new Map<
        string,
        Array<{ stopSequence: number; arrivalTime: string | null; departureTime: string | null; stop: TransitStopData }>
      >();

      times.forEach((t) => {
        if (!resultMap.has(t.tripId)) {
          resultMap.set(t.tripId, []);
        }
        resultMap.get(t.tripId)!.push({
          stopSequence: t.stopSequence,
          arrivalTime: t.arrivalTime,
          departureTime: t.departureTime,
          stop: stopMap.get(t.stopId) || { id: t.stopId, name: t.stopId, latitude: 0, longitude: 0 },
        });
      });

      for (const list of resultMap.values()) {
        list.sort((a, b) => a.stopSequence - b.stopSequence);
      }

      return resultMap;
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to bulk query ordered stops: ${err?.message}`);
    }
  }

  /**
   * Bulk-fetch stop times, trips, and routes serving a set of stops
   */
  static async getStopTimesAndTripsForStops(stopIds: string[]) {
    TransitServiceMetrics.serviceCalls++;
    if (stopIds.length === 0) return { stopTimes: [], trips: [], routes: [], stops: [] };

    try {
      TransitServiceMetrics.sqlQueries++;
      const times = await db.select().from(stopTimes).where(inArray(stopTimes.stopId, stopIds));
      if (times.length === 0) return { stopTimes: [], trips: [], routes: [], stops: [] };

      const tripIds = Array.from(new Set(times.map((t) => t.tripId)));
      TransitServiceMetrics.sqlQueries++;
      const matchedTrips = await db.select().from(trips).where(inArray(trips.id, tripIds));

      const routeIds = Array.from(new Set(matchedTrips.map((t) => t.routeId)));
      TransitServiceMetrics.sqlQueries++;
      const matchedRoutes = await db.select().from(routes).where(inArray(routes.id, routeIds));

      const matchedStops = await db.select().from(stops).where(inArray(stops.id, stopIds));

      return {
        stopTimes: times,
        trips: matchedTrips,
        routes: matchedRoutes,
        stops: matchedStops,
      };
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to bulk query stop times and trips: ${err?.message}`);
    }
  }

  /**
   * Derive direct journey between two stops directly from PostgreSQL relationships.
   * Handles platform clusters (e.g. opposite side of street stops within 500m).
   */
  static async findDirectJourney(
    originStopId: string,
    destinationStopId: string
  ): Promise<DirectJourneyResult | null> {
    try {
      // 1. Get primary origin stop & destination stop info from PostgreSQL
      const [originStop] = await db.select().from(stops).where(eq(stops.id, originStopId));
      const [destinationStop] = await db.select().from(stops).where(eq(stops.id, destinationStopId));

      if (!originStop || !destinationStop) {
        return null;
      }

      // Find platform stop IDs within 500m hub clusters
      const originStopsNear = await this.findStopsNear(originStop.latitude, originStop.longitude, 500);
      const destinationStopsNear = await this.findStopsNear(destinationStop.latitude, destinationStop.longitude, 500);

      const originStopIds = Array.from(new Set([originStopId, ...originStopsNear.map((s) => s.id)]));
      const destinationStopIds = Array.from(new Set([destinationStopId, ...destinationStopsNear.map((s) => s.id)]));

      // 2. Fetch stop times for origin candidates and destination candidates from PostgreSQL
      const originStopTimes = await db.select().from(stopTimes).where(inArray(stopTimes.stopId, originStopIds));
      const destStopTimes = await db.select().from(stopTimes).where(inArray(stopTimes.stopId, destinationStopIds));

      const originTimesMap = new Map<string, Array<{ stopId: string; sequence: number }>>();
      originStopTimes.forEach((st) => {
        if (!originTimesMap.has(st.tripId)) {
          originTimesMap.set(st.tripId, []);
        }
        originTimesMap.get(st.tripId)!.push({ stopId: st.stopId, sequence: st.stopSequence });
      });

      const destTimesMap = new Map<string, Array<{ stopId: string; sequence: number }>>();
      destStopTimes.forEach((st) => {
        if (!destTimesMap.has(st.tripId)) {
          destTimesMap.set(st.tripId, []);
        }
        destTimesMap.get(st.tripId)!.push({ stopId: st.stopId, sequence: st.stopSequence });
      });

      // 3. Find matching trip where origin sequence < destination sequence
      let matchingTripId: string | null = null;
      let actualBoardingStopId = originStopId;
      let actualAlightingStopId = destinationStopId;
      let boardingSeq = 0;
      let alightingSeq = 0;

      for (const [tripId, originList] of originTimesMap.entries()) {
        if (destTimesMap.has(tripId)) {
          const destList = destTimesMap.get(tripId)!;
          for (const originItem of originList) {
            for (const destItem of destList) {
              if (originItem.sequence < destItem.sequence) {
                matchingTripId = tripId;
                actualBoardingStopId = originItem.stopId;
                actualAlightingStopId = destItem.stopId;
                boardingSeq = originItem.sequence;
                alightingSeq = destItem.sequence;
                break;
              }
            }
            if (matchingTripId) break;
          }
        }
        if (matchingTripId) break;
      }

      if (!matchingTripId) {
        return null;
      }

      // 4. Fetch trip and route from PostgreSQL
      const [matchingTrip] = await db.select().from(trips).where(eq(trips.id, matchingTripId));
      if (!matchingTrip) return null;

      const [matchingRoute] = await db.select().from(routes).where(eq(routes.id, matchingTrip.routeId));
      if (!matchingRoute) return null;

      const [actualBoardingStop] = await db.select().from(stops).where(eq(stops.id, actualBoardingStopId));
      const [actualAlightingStop] = await db.select().from(stops).where(eq(stops.id, actualAlightingStopId));

      const bStop = actualBoardingStop || originStop;
      const aStop = actualAlightingStop || destinationStop;

      return {
        originStop: {
          id: bStop.id,
          name: bStop.name,
          latitude: bStop.latitude,
          longitude: bStop.longitude,
        },
        destinationStop: {
          id: aStop.id,
          name: aStop.name,
          latitude: aStop.latitude,
          longitude: aStop.longitude,
        },
        transitLeg: {
          tripId: matchingTrip.id,
          routeId: matchingRoute.id,
          routeShortName: matchingRoute.shortName,
          routeLongName: matchingRoute.longName,
          routeType: matchingRoute.routeType,
          boardingStopId: bStop.id,
          alightingStopId: aStop.id,
          boardingSequence: boardingSeq,
          alightingSequence: alightingSeq,
          stopsCount: Math.abs(alightingSeq - boardingSeq),
        },
        trust: {
          transitDataStatus: "VERIFIED",
          fareDataStatus: "UNAVAILABLE",
          realtimeDataStatus: "UNAVAILABLE",
        },
      };
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Direct journey lookup failed: ${err?.message}`);
    }
  }
}
