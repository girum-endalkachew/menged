import { describe, expect, test, beforeAll } from "bun:test";
import { RouterService } from "../router";
import { RoutingDatasetLoader } from "../routingDatasetLoader";
import { SqlTracker } from "@/db/sqlTracker";
import { RouteRequest, TransitLeg } from "@/types/journey";

describe("RouterService In-Memory Routing & Query Independence Tests", () => {
  beforeAll(async () => {
    await RoutingDatasetLoader.initGlobalGraph();
  }, 30000);
  test("Step 6: Measure and report RoutingGraph memory footprint", async () => {
    const memoryStats = await RoutingDatasetLoader.measureGraphMemoryFootprint();
    console.log(`\n=== RoutingGraph Memory Measurement ===`);
    console.log(`Heap Before Construction: ${memoryStats.heapBeforeMB} MB`);
    console.log(`Heap After Construction : ${memoryStats.heapAfterMB} MB`);
    console.log(`Measured Heap Delta     : ${memoryStats.measuredHeapDeltaMB} MB`);
    console.log(`Estimated Retained Cost : ${memoryStats.estimatedRetainedMB} MB`);

    expect(memoryStats.estimatedRetainedMB).toBeGreaterThan(0);
    expect(memoryStats.measurementType).toBe("runtime_heap_sample_and_estimate");
    expect(typeof memoryStats.notes).toBe("string");
  }, 30000);

  test("Single-Flight Graph Initialization: 10 concurrent cold requests execute only ONE DB load", async () => {
    RoutingDatasetLoader.clearGlobalGraph();

    const track = await SqlTracker.run(async () => {
      const graphPromises = Array.from({ length: 10 }).map(() =>
        RoutingDatasetLoader.initGlobalGraph()
      );
      return Promise.all(graphPromises);
    });

    const graphs = track.result;
    expect(graphs.length).toBe(10);

    // Verify all 10 callers received the EXACT SAME graph object reference
    const firstGraph = graphs[0];
    for (const g of graphs) {
      expect(g).toBe(firstGraph);
    }

    // Verify exactly 4 SQL bulk queries occurred total, NOT 40 queries!
    expect(track.queryCount).toBe(4);
  }, 30000);

  test("Step 11: Candidate Expansion Query Independence — SQL count does NOT scale linearly with candidate pair count", async () => {
    await RoutingDatasetLoader.initGlobalGraph();

    // 1. Small candidate slice (max 2 candidates per side)
    const smallReq: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
      preferences: { maxOriginCandidates: 2, maxDestCandidates: 2 },
    };

    const smallTrack = await SqlTracker.run(async () => {
      return RouterService.findJourneysWithDiagnostics(smallReq);
    });

    // 2. Large candidate slice (max 20 candidates per side = 400 candidate pairs!)
    const largeReq: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
      preferences: { maxOriginCandidates: 20, maxDestCandidates: 20 },
    };

    const largeTrack = await SqlTracker.run(async () => {
      return RouterService.findJourneysWithDiagnostics(largeReq);
    });

    console.log(`\n=== Candidate Expansion Query Count Comparison ===`);
    console.log(`Small Request (2x2 = 4 candidate pairs)  : ${smallTrack.queryCount} SQL queries`);
    console.log(`Large Request (20x20 = 400 candidate pairs): ${largeTrack.queryCount} SQL queries`);

    // Invariant: Candidate evaluation itself performs ZERO SQL. SQL query count must be equal (2 spatial queries)!
    expect(smallTrack.queryCount).toBe(2);
    expect(largeTrack.queryCount).toBe(2);
    expect(largeTrack.queryCount).toBe(smallTrack.queryCount);
  }, 30000);

  test("Golden Corridor (Bole -> Piassa) derives Route 10410198 (AB009) with populated orderedStops", async () => {
    const request: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0365871, longitude: 38.7522029 },
    };

    const { journeys, diagnostics } = await RouterService.findJourneysWithDiagnostics(request);
    expect(journeys.length).toBeGreaterThan(0);
    expect(diagnostics.sqlQueries).toBe(2); // Exactly 2 spatial queries!

    const goldenJourney = journeys.find((j) => {
      const l = j.legs.find((leg) => leg.type === "TRANSIT") as TransitLeg | undefined;
      return l?.routeId === "10410198";
    }) || journeys[0];

    expect(goldenJourney.transfersCount).toBe(0);
    expect(goldenJourney.trust.transit).toBe("VERIFIED");

    const transitLeg = goldenJourney.legs.find((l) => l.type === "TRANSIT") as TransitLeg | undefined;
    expect(transitLeg).toBeDefined();
    if (transitLeg) {
      expect(transitLeg.routeId).toBe("10410198");
      expect(transitLeg.routeShortName).toBe("AB009");
      expect(transitLeg.boardingStop.name).toBe("Bole Medhanialem");
      expect(transitLeg.alightingStop.name).toBe("Piassa Arada");

      expect(transitLeg.boardingSequence).toBeLessThan(transitLeg.alightingSequence);
      expect(transitLeg.orderedStops.length).toBeGreaterThan(0);
      expect(transitLeg.orderedStops[0].id).toBe(transitLeg.boardingStop.id);
      expect(transitLeg.orderedStops[transitLeg.orderedStops.length - 1].id).toBe(transitLeg.alightingStop.id);
    }
  }, 10000);

  test("1-Transfer Search (Bole -> Ayat Chefe) derives 1-transfer journey with verified sequences", async () => {
    const request: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.0212283, longitude: 38.8717948 },
      preferences: { maxTransfers: 1 },
    };

    const { journeys, diagnostics } = await RouterService.findJourneysWithDiagnostics(request);
    expect(journeys.length).toBeGreaterThan(0);
    expect(diagnostics.sqlQueries).toBe(2); // Exactly 2 spatial queries!

    const transferJourney = journeys.find((j) => j.transfersCount === 1);
    expect(transferJourney).toBeDefined();
    if (transferJourney) {
      expect(transferJourney.transfersCount).toBe(1);
      const legsTypes = transferJourney.legs.map((l) => l.type);
      expect(legsTypes).toEqual(["WALK", "TRANSIT", "TRANSFER", "TRANSIT", "WALK"]);

      const transitLegs = transferJourney.legs.filter((l) => l.type === "TRANSIT") as TransitLeg[];
      expect(transitLegs.length).toBe(2);

      for (const leg of transitLegs) {
        expect(leg.boardingSequence).toBeLessThan(leg.alightingSequence);
        expect(leg.orderedStops.length).toBeGreaterThan(0);
      }
    }
  }, 10000);

  test("Negative Case: Unserved location returns 0 direct routes without fabricating data", async () => {
    const request: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 9.06, longitude: 38.65 },
      preferences: { maxTransfers: 0 },
    };

    const journeys = await RouterService.findJourneys(request);
    expect(journeys.length).toBe(0);
  }, 10000);

  test("P0-01 Regression: Reverse-direction candidate where boarding sequence >= alighting sequence is strictly rejected", async () => {
    const reverseRequest: RouteRequest = {
      origin: { latitude: 9.0365871, longitude: 38.7522029 }, // Piassa
      destination: { latitude: 8.9983386, longitude: 38.7860596 }, // Bole
    };

    const journeys = await RouterService.findJourneys(reverseRequest);
    for (const j of journeys) {
      const transitLegs = j.legs.filter((l) => l.type === "TRANSIT") as TransitLeg[];
      for (const leg of transitLegs) {
        expect(leg.boardingSequence).toBeLessThan(leg.alightingSequence);
      }
    }
  }, 10000);

  test("Adversarial Input Matrix: Invalid, NaN, Infinity, out of range coordinates, and Origin=Destination return empty without throwing", async () => {
    const nanReq: RouteRequest = {
      origin: { latitude: NaN, longitude: 38.786 },
      destination: { latitude: 9.036, longitude: 38.752 },
    };
    expect(await RouterService.findJourneys(nanReq)).toEqual([]);

    const infReq: RouteRequest = {
      origin: { latitude: 8.998, longitude: Infinity },
      destination: { latitude: 9.036, longitude: 38.752 },
    };
    expect(await RouterService.findJourneys(infReq)).toEqual([]);

    const outOfBoundsReq: RouteRequest = {
      origin: { latitude: 120.0, longitude: 38.786 },
      destination: { latitude: 9.036, longitude: 38.752 },
    };
    expect(await RouterService.findJourneys(outOfBoundsReq)).toEqual([]);

    const sameLocReq: RouteRequest = {
      origin: { latitude: 8.9983386, longitude: 38.7860596 },
      destination: { latitude: 8.9983386, longitude: 38.7860596 },
    };
    expect(await RouterService.findJourneys(sameLocReq)).toEqual([]);
  }, 10000);
});
