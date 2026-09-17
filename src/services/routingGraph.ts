import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { TransitStopData, TransitRouteData } from "./transitService";
import { StopTimeRecord, TripRecord } from "@/db/repositories/transitRepository";

export interface OrderedStop {
  stopSequence: number;
  arrivalTime: string | null;
  departureTime: string | null;
  stop: TransitStopData;
}

export class RoutingGraph {
  readonly stopsById: Map<string, TransitStopData>;
  readonly stopTimesByStopId: Map<string, StopTimeRecord[]>;
  readonly stopTimesByTripId: Map<string, StopTimeRecord[]>;
  readonly tripsById: Map<string, TripRecord>;
  readonly routesById: Map<string, TransitRouteData>;
  readonly orderedStopsByTripId: Map<string, OrderedStop[]>;

  constructor(
    stopsList: TransitStopData[],
    routesList: TransitRouteData[],
    tripsList: TripRecord[],
    stopTimesList: StopTimeRecord[]
  ) {
    this.stopsById = new Map(stopsList.map((s) => [s.id, s]));
    this.routesById = new Map(routesList.map((r) => [r.id, r]));
    this.tripsById = new Map(tripsList.map((t) => [t.id, t]));

    const byStop = new Map<string, StopTimeRecord[]>();
    const byTrip = new Map<string, StopTimeRecord[]>();

    for (const st of stopTimesList) {
      if (!byStop.has(st.stopId)) {
        byStop.set(st.stopId, []);
      }
      byStop.get(st.stopId)!.push(st);

      if (!byTrip.has(st.tripId)) {
        byTrip.set(st.tripId, []);
      }
      byTrip.get(st.tripId)!.push(st);
    }

    this.stopTimesByStopId = byStop;
    this.stopTimesByTripId = byTrip;

    // Precompute orderedStopsByTripId (sorted strictly by stopSequence ascending)
    const orderedMap = new Map<string, OrderedStop[]>();
    for (const [tripId, stList] of byTrip.entries()) {
      const sortedStList = [...stList].sort((a, b) => a.stopSequence - b.stopSequence);
      const ordered: OrderedStop[] = sortedStList.map((st) => ({
        stopSequence: st.stopSequence,
        arrivalTime: st.arrivalTime,
        departureTime: st.departureTime,
        stop: this.stopsById.get(st.stopId) || {
          id: st.stopId,
          name: st.stopId,
          latitude: 0,
          longitude: 0,
        },
      }));
      orderedMap.set(tripId, ordered);
    }

    this.orderedStopsByTripId = orderedMap;
  }

  getStop(id: string): TransitStopData | undefined {
    return this.stopsById.get(id);
  }

  getRoute(id: string): TransitRouteData | undefined {
    return this.routesById.get(id);
  }

  getTrip(id: string): TripRecord | undefined {
    return this.tripsById.get(id);
  }

  getStopTimesForStop(stopId: string): StopTimeRecord[] {
    return this.stopTimesByStopId.get(stopId) || [];
  }

  getStopTimesForTrip(tripId: string): StopTimeRecord[] {
    return this.stopTimesByTripId.get(tripId) || [];
  }

  getOrderedStopsForTrip(tripId: string): OrderedStop[] {
    return this.orderedStopsByTripId.get(tripId) || [];
  }

  findStopsNear(lat: number, lon: number, radiusMeters = 500): TransitStopData[] {
    const degreesPerMeter = 1 / 111000;
    const maxDegreeDelta = radiusMeters * degreesPerMeter;
    const ptOrigin = point([lon, lat]);

    const candidates: TransitStopData[] = [];
    for (const stop of this.stopsById.values()) {
      const dLat = Math.abs(stop.latitude - lat);
      const dLon = Math.abs(stop.longitude - lon);
      if (dLat <= maxDegreeDelta && dLon <= maxDegreeDelta) {
        const ptStop = point([stop.longitude, stop.latitude]);
        const distKm = distance(ptOrigin, ptStop, { units: "kilometers" });
        if (distKm * 1000 <= radiusMeters) {
          candidates.push(stop);
        }
      }
    }
    return candidates;
  }
}
