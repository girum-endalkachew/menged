import { db } from "@/db";
import { stops, routes, trips, stopTimes } from "@/db/schema";
import { eq, inArray, like, and, between } from "drizzle-orm";
import { TransitStopData, TransitRouteData } from "@/services/transitService";

export interface StopTimeRecord {
  tripId: string;
  stopId: string;
  stopSequence: number;
  arrivalTime: string | null;
  departureTime: string | null;
}

export interface TripRecord {
  id: string;
  routeId: string;
  serviceId: string;
  headsign: string | null;
  directionId: number | null;
}

export class TransitRepository {
  /**
   * Spatial query to find stops near coordinates within radiusMeters using composite index
   */
  static async findStopsNear(
    lat: number,
    lon: number,
    radiusMeters = 500
  ): Promise<TransitStopData[]> {
    const degreesPerMeter = 1 / 111000;
    const maxDegreeDelta = radiusMeters * degreesPerMeter;

    const minLat = lat - maxDegreeDelta;
    const maxLat = lat + maxDegreeDelta;
    const minLon = lon - maxDegreeDelta;
    const maxLon = lon + maxDegreeDelta;

    try {
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
   * Find stops matching a name substring
   */
  static async findStopByName(name: string): Promise<TransitStopData[]> {
    try {
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
   * Bulk fetch all stops in database
   */
  static async fetchAllStops(): Promise<TransitStopData[]> {
    try {
      return await db.select().from(stops);
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to fetch all stops: ${err?.message}`);
    }
  }

  /**
   * Bulk fetch all routes in database
   */
  static async fetchAllRoutes(): Promise<TransitRouteData[]> {
    try {
      return await db.select().from(routes);
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to fetch all routes: ${err?.message}`);
    }
  }

  /**
   * Bulk fetch all trips in database
   */
  static async fetchAllTrips(): Promise<TripRecord[]> {
    try {
      return await db.select().from(trips);
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to fetch all trips: ${err?.message}`);
    }
  }

  /**
   * Bulk fetch all stop_times in database
   */
  static async fetchAllStopTimes(): Promise<StopTimeRecord[]> {
    try {
      return await db.select().from(stopTimes);
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to fetch all stop_times: ${err?.message}`);
    }
  }

  /**
   * Set-based query: fetch stop_times serving any of the given stopIds
   */
  static async fetchBulkStopTimesForStops(stopIds: string[]): Promise<StopTimeRecord[]> {
    if (stopIds.length === 0) return [];
    try {
      return await db.select().from(stopTimes).where(inArray(stopTimes.stopId, stopIds));
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to bulk fetch stop_times for stops: ${err?.message}`);
    }
  }

  /**
   * Set-based query: fetch trips matching any of the given tripIds
   */
  static async fetchBulkTrips(tripIds: string[]): Promise<TripRecord[]> {
    if (tripIds.length === 0) return [];
    try {
      return await db.select().from(trips).where(inArray(trips.id, tripIds));
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to bulk fetch trips: ${err?.message}`);
    }
  }

  /**
   * Set-based query: fetch routes matching any of the given routeIds
   */
  static async fetchBulkRoutes(routeIds: string[]): Promise<TransitRouteData[]> {
    if (routeIds.length === 0) return [];
    try {
      return await db.select().from(routes).where(inArray(routes.id, routeIds));
    } catch (err: any) {
      throw new Error(`[DATABASE_CONNECTION_ERROR] Failed to bulk fetch routes: ${err?.message}`);
    }
  }
}
