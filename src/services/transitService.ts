import { TransitRepository, StopTimeRecord, TripRecord } from "@/db/repositories/transitRepository";

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
  originStop: TransitStopData;
  destinationStop: TransitStopData;
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
   * Find stops matching name query
   */
  static async findStopByName(name: string): Promise<TransitStopData[]> {
    TransitServiceMetrics.serviceCalls++;
    return TransitRepository.findStopByName(name);
  }

  /**
   * Find stops within a given radius in meters
   */
  static async findStopsNear(lat: number, lon: number, radiusMeters = 500): Promise<TransitStopData[]> {
    TransitServiceMetrics.serviceCalls++;
    return TransitRepository.findStopsNear(lat, lon, radiusMeters);
  }

  /**
   * Get all routes serving a specific stop
   */
  static async getRoutesForStop(stopId: string): Promise<TransitRouteData[]> {
    TransitServiceMetrics.serviceCalls++;
    const times = await TransitRepository.fetchBulkStopTimesForStops([stopId]);
    const tripIds = times.map((t) => t.tripId);
    if (tripIds.length === 0) return [];

    const matchedTrips = await TransitRepository.fetchBulkTrips(tripIds);
    const routeIds = Array.from(new Set(matchedTrips.map((t) => t.routeId)));
    if (routeIds.length === 0) return [];

    return TransitRepository.fetchBulkRoutes(routeIds);
  }

  /**
   * Get trips for a route
   */
  static async getTripsForRoute(routeId: string): Promise<TripRecord[]> {
    TransitServiceMetrics.serviceCalls++;
    return TransitRepository.fetchBulkTrips([routeId]);
  }

  /**
   * Legacy Direct journey lookup helper
   */
  static async findDirectJourney(
    originStopId: string,
    destinationStopId: string
  ): Promise<DirectJourneyResult | null> {
    TransitServiceMetrics.serviceCalls++;
    const stopsList = await TransitRepository.fetchAllStops();
    const originStop = stopsList.find((s) => s.id === originStopId);
    const destStop = stopsList.find((s) => s.id === destinationStopId);
    if (!originStop || !destStop) return null;

    const times = await TransitRepository.fetchBulkStopTimesForStops([originStopId, destinationStopId]);
    const origTimes = times.filter((t) => t.stopId === originStopId);
    const destTimes = times.filter((t) => t.stopId === destinationStopId);

    let matchTripId: string | null = null;
    let bSeq = 0;
    let aSeq = 0;

    for (const ot of origTimes) {
      const dt = destTimes.find((d) => d.tripId === ot.tripId && ot.stopSequence < d.stopSequence);
      if (dt) {
        matchTripId = ot.tripId;
        bSeq = ot.stopSequence;
        aSeq = dt.stopSequence;
        break;
      }
    }

    if (!matchTripId) return null;

    const [trip] = await TransitRepository.fetchBulkTrips([matchTripId]);
    if (!trip) return null;

    const [route] = await TransitRepository.fetchBulkRoutes([trip.routeId]);
    if (!route) return null;

    return {
      originStop,
      destinationStop: destStop,
      transitLeg: {
        tripId: trip.id,
        routeId: route.id,
        routeShortName: route.shortName,
        routeLongName: route.longName,
        routeType: route.routeType,
        boardingStopId: originStop.id,
        alightingStopId: destStop.id,
        boardingSequence: bSeq,
        alightingSequence: aSeq,
        stopsCount: Math.abs(aSeq - bSeq),
      },
      trust: {
        transitDataStatus: "VERIFIED",
        fareDataStatus: "UNAVAILABLE",
        realtimeDataStatus: "UNAVAILABLE",
      },
    };
  }
}
