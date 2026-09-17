import { TransitRepository } from "@/db/repositories/transitRepository";
import { RoutingGraph } from "./routingGraph";
import { TransitStopData } from "./transitService";

export interface GraphMemoryStats {
  heapBeforeMB: number;
  heapAfterMB: number;
  measuredHeapDeltaMB: number;
  estimatedRetainedMB: number;
  measurementType: "runtime_heap_sample_and_estimate";
  notes: string;
}

export class RoutingDatasetLoader {
  private static globalGraph: RoutingGraph | null = null;
  private static initPromise: Promise<RoutingGraph> | null = null;

  /**
   * Single-flight initialization of application-level cached RoutingGraph.
   * Guarantees only one DB dataset load occurs when concurrent cold requests arrive.
   */
  static async initGlobalGraph(): Promise<RoutingGraph> {
    if (this.globalGraph) {
      return this.globalGraph;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    let resolvePromise!: (val: RoutingGraph) => void;
    let rejectPromise!: (err: any) => void;
    const promise = new Promise<RoutingGraph>((res, rej) => {
      resolvePromise = res;
      rejectPromise = rej;
    });

    this.initPromise = promise;

    this.reloadGlobalGraph()
      .then((g) => {
        resolvePromise(g);
      })
      .catch((err) => {
        rejectPromise(err);
      })
      .finally(() => {
        if (this.initPromise === promise) {
          this.initPromise = null;
        }
      });

    return promise;
  }

  /**
   * Atomic reload of application-level RoutingGraph
   */
  static async reloadGlobalGraph(): Promise<RoutingGraph> {
    const [stopsList, routesList, tripsList, stopTimesList] = await Promise.all([
      TransitRepository.fetchAllStops(),
      TransitRepository.fetchAllRoutes(),
      TransitRepository.fetchAllTrips(),
      TransitRepository.fetchAllStopTimes(),
    ]);

    const newGraph = new RoutingGraph(stopsList, routesList, tripsList, stopTimesList);

    // Atomic reference replacement
    this.globalGraph = newGraph;
    return newGraph;
  }

  /**
   * Clear global graph cache (e.g. for cold-cache benchmarks/testing)
   */
  static clearGlobalGraph(): void {
    this.globalGraph = null;
    this.initPromise = null;
  }

  /**
   * Get cached global graph instance (initializes if null via single-flight mechanism)
   */
  static async getGlobalGraph(): Promise<RoutingGraph> {
    if (this.globalGraph) {
      return this.globalGraph;
    }
    return this.initGlobalGraph();
  }

  /**
   * Request-level bulk loader fallback (loads dataset for candidate stops dynamically via bulk queries)
   */
  static async loadGraphForRequest(
    candidateOriginStops: TransitStopData[],
    candidateDestStops: TransitStopData[]
  ): Promise<RoutingGraph> {
    const originIds = candidateOriginStops.map((s) => s.id);
    const destIds = candidateDestStops.map((s) => s.id);
    const allStopIds = Array.from(new Set([...originIds, ...destIds]));

    const bulkTimes = await TransitRepository.fetchBulkStopTimesForStops(allStopIds);
    const tripIds = Array.from(new Set(bulkTimes.map((t) => t.tripId)));

    const [bulkTrips, bulkStops, completeTripTimes] = await Promise.all([
      TransitRepository.fetchBulkTrips(tripIds),
      TransitRepository.fetchAllStops(),
      TransitRepository.fetchAllStopTimes(),
    ]);

    const routeIds = Array.from(new Set(bulkTrips.map((t) => t.routeId)));
    const bulkRoutes = await TransitRepository.fetchBulkRoutes(routeIds);

    const filteredTripTimes = completeTripTimes.filter((st) => tripIds.includes(st.tripId));

    return new RoutingGraph(bulkStops, bulkRoutes, bulkTrips, filteredTripTimes);
  }

  /**
   * Measures runtime heap delta and calculates structural retained memory estimate.
   * Note: JS runtimes (V8/Bun) heap delta includes GC noise and allocator pooling.
   * This telemetry distinguishes empirical heap delta from structural size estimates.
   */
  static async measureGraphMemoryFootprint(): Promise<GraphMemoryStats> {
    const heapBefore = process.memoryUsage().heapUsed;
    const graph = await this.getGlobalGraph();

    if (typeof globalThis.gc === "function") {
      try {
        globalThis.gc();
      } catch {
        // GC optional
      }
    }

    const heapAfter = process.memoryUsage().heapUsed;
    const rawDelta = heapAfter - heapBefore;
    const measuredHeapDeltaMB = Math.max(0, Math.round((rawDelta / (1024 * 1024)) * 100) / 100);

    // Calculate structural retained size estimate based on GTFS object graph structures
    const stopsCount = graph.stopsById.size;
    const routesCount = graph.routesById.size;
    const tripsCount = graph.tripsById.size;
    const stopTimesCount = graph.stopTimesByStopId.size;

    // Approximate memory footprint per object in JS Maps (V8 object + map entry overhead)
    const estimatedBytes =
      stopsCount * 350 +
      routesCount * 300 +
      tripsCount * 250 +
      stopTimesCount * 250;

    const estimatedRetainedMB = Math.round((estimatedBytes / (1024 * 1024)) * 100) / 100;

    return {
      heapBeforeMB: Math.round((heapBefore / (1024 * 1024)) * 100) / 100,
      heapAfterMB: Math.round((heapAfter / (1024 * 1024)) * 100) / 100,
      measuredHeapDeltaMB,
      estimatedRetainedMB,
      measurementType: "runtime_heap_sample_and_estimate",
      notes: "measuredHeapDeltaMB reflects runtime process heap delta; estimatedRetainedMB calculates structural JS Map overhead.",
    };
  }
}
