import { describe, test, expect } from "bun:test";
import { Journey, Coordinate } from "@/types/journey";
import { JourneyMetrics } from "@/types/journeyMetrics";
import { JourneyRankingService } from "../journeyRanking";
import { JourneyMetricsService } from "../journeyMetrics";
import { RouterService } from "../router";

function createMockJourney(params: {
  id: string;
  durationMinutes: number;
  walkingMeters: number;
  transfersCount: number;
  backtrackingMeters?: number;
  origin?: Coordinate;
  destination?: Coordinate;
  fareStatus?: "UNAVAILABLE" | "ESTIMATED";
  metrics?: Partial<JourneyMetrics>;
}): Journey {
  const origin = params.origin || { latitude: 8.9983, longitude: 38.7860 };
  const destination = params.destination || { latitude: 9.0365, longitude: 38.7522 };

  const walkLeg1Distance = Math.round(params.walkingMeters * 0.6);
  const walkLeg2Distance = params.walkingMeters - walkLeg1Distance;

  const mockMetrics: JourneyMetrics = {
    totalWalkingMeters: params.walkingMeters,
    walkingBeforeFirstTransitMeters: walkLeg1Distance,
    walkingAfterLastTransitMeters: walkLeg2Distance,
    transfersCount: params.transfersCount,
    estimatedDurationMinutes: params.durationMinutes,
    transitLegsCount: params.transfersCount + 1,
    transitDistanceMeters: 5000,
    journeyGeometryDistanceMeters: 5500 + (params.backtrackingMeters || 0),
    initialDestinationProgressMeters: 200,
    totalBacktrackingMeters: params.backtrackingMeters ?? 0,
    destinationProgressRatio: 5600 / (5500 + (params.backtrackingMeters || 0)),
    initialDirectionAlignment: 0.95,
    ...params.metrics,
  };

  const journey: Journey = {
    id: params.id,
    origin,
    destination,
    legs: [
      {
        type: "WALK",
        from: { name: "Origin", latitude: origin.latitude, longitude: origin.longitude },
        to: { name: "Boarding Stop", latitude: origin.latitude + 0.001, longitude: origin.longitude + 0.001 },
        distanceMeters: walkLeg1Distance,
        estimatedMinutes: Math.ceil(walkLeg1Distance / 75),
      },
      {
        type: "TRANSIT",
        routeId: "mock-route-1",
        routeShortName: "MOCK1",
        routeLongName: "Mock Transit",
        routeType: 3,
        boardingStop: { id: "stop_1", name: "Boarding Stop", latitude: origin.latitude + 0.001, longitude: origin.longitude + 0.001 },
        alightingStop: { id: "stop_2", name: "Alighting Stop", latitude: destination.latitude - 0.001, longitude: destination.longitude - 0.001 },
        boardingSequence: 1,
        alightingSequence: 5,
        stopsCount: 4,
        orderedStops: [
          { id: "stop_1", name: "Boarding Stop", latitude: origin.latitude + 0.001, longitude: origin.longitude + 0.001, stopSequence: 1 },
          { id: "stop_2", name: "Alighting Stop", latitude: destination.latitude - 0.001, longitude: destination.longitude - 0.001, stopSequence: 5 },
        ],
      },
      {
        type: "WALK",
        from: { name: "Alighting Stop", latitude: destination.latitude - 0.001, longitude: destination.longitude - 0.001 },
        to: { name: "Destination", latitude: destination.latitude, longitude: destination.longitude },
        distanceMeters: walkLeg2Distance,
        estimatedMinutes: Math.ceil(walkLeg2Distance / 75),
      },
    ],
    totalWalkingMeters: params.walkingMeters,
    transfersCount: params.transfersCount,
    estimatedDurationMinutes: params.durationMinutes,
    score: params.durationMinutes + params.walkingMeters * 0.05,
    tag: "Balanced",
    trust: {
      transit: "VERIFIED",
      fare: params.fareStatus || "UNAVAILABLE",
      realtime: "UNAVAILABLE",
    },
    metrics: mockMetrics,
  };

  return journey;
}

describe("JourneyRankingService Deterministic Ranking", () => {
  // CASE A — FASTEST
  test("CASE A — FASTEST: Prioritizes estimated duration over walking distance", () => {
    // Journey A: 30 minutes, 800m walking
    const journeyA = createMockJourney({
      id: "journey_A",
      durationMinutes: 30,
      walkingMeters: 800,
      transfersCount: 0,
    });

    // Journey B: 40 minutes, 200m walking
    const journeyB = createMockJourney({
      id: "journey_B",
      durationMinutes: 40,
      walkingMeters: 200,
      transfersCount: 0,
    });

    const ranked = JourneyRankingService.rankJourneys([journeyB, journeyA], "fastest");

    expect(ranked[0].id).toBe("journey_A");
    expect(ranked[1].id).toBe("journey_B");
    expect(ranked[0].tag).toBe("Fastest");
  });

  // CASE B — LEAST WALKING
  test("CASE B — LEAST WALKING: Prioritizes total walking meters over duration", () => {
    // Journey A: 30 minutes, 800m walking
    const journeyA = createMockJourney({
      id: "journey_A",
      durationMinutes: 30,
      walkingMeters: 800,
      transfersCount: 0,
    });

    // Journey B: 40 minutes, 200m walking
    const journeyB = createMockJourney({
      id: "journey_B",
      durationMinutes: 40,
      walkingMeters: 200,
      transfersCount: 0,
    });

    const ranked = JourneyRankingService.rankJourneys([journeyA, journeyB], "least_walking");

    expect(ranked[0].id).toBe("journey_B");
    expect(ranked[1].id).toBe("journey_A");
    expect(ranked[0].tag).toBe("Least Walking");
  });

  // CASE C — FEWEST TRANSFERS
  test("CASE C — FEWEST TRANSFERS: Prioritizes transfersCount over duration", () => {
    // Journey A: 0 transfers, 45 minutes
    const journeyA = createMockJourney({
      id: "journey_A_direct",
      durationMinutes: 45,
      walkingMeters: 500,
      transfersCount: 0,
    });

    // Journey B: 1 transfer, 35 minutes
    const journeyB = createMockJourney({
      id: "journey_B_transfer",
      durationMinutes: 35,
      walkingMeters: 500,
      transfersCount: 1,
    });

    const ranked = JourneyRankingService.rankJourneys([journeyB, journeyA], "fewest_transfers");

    expect(ranked[0].id).toBe("journey_A_direct");
    expect(ranked[1].id).toBe("journey_B_transfer");
  });

  // CASE D — BACKTRACKING SANITY
  test("CASE D — BACKTRACKING SANITY: Distinguishes large overshoot while tolerating small geometric detours", () => {
    // Journey A: normal geometry, 0m backtracking, 40 min, 500m walk
    const journeyA = createMockJourney({
      id: "journey_A_clean",
      durationMinutes: 40,
      walkingMeters: 500,
      transfersCount: 0,
      backtrackingMeters: 0,
    });

    // Journey B: small geometric detour (60m backtracking, e.g. roundabout/urban turnaround), 40 min, 500m walk
    const journeyB = createMockJourney({
      id: "journey_B_small_detour",
      durationMinutes: 40,
      walkingMeters: 500,
      transfersCount: 0,
      backtrackingMeters: 60,
    });

    // Journey C: large unnecessary overshoot (1200m backtracking), 40 min, 500m walk
    const journeyC = createMockJourney({
      id: "journey_C_large_overshoot",
      durationMinutes: 40,
      walkingMeters: 500,
      transfersCount: 0,
      backtrackingMeters: 1200,
    });

    const ranked = JourneyRankingService.rankJourneys([journeyC, journeyB, journeyA], "balanced");

    // Both A (0m) and B (60m) are within normal urban tolerance (<= 150m), so neither is heavily penalized.
    // Journey C with 1200m backtracking is an obvious overshoot and must be placed last.
    expect(ranked[2].id).toBe("journey_C_large_overshoot");

    // Tiny backtracking does not ruin a slightly faster journey:
    // If Journey B was 38 mins (slightly faster) with 60m backtracking vs A at 40 mins with 0m backtracking:
    const journeyBFaster = createMockJourney({
      id: "journey_B_faster_small_detour",
      durationMinutes: 38,
      walkingMeters: 500,
      transfersCount: 0,
      backtrackingMeters: 60,
    });
    const rankedWithFasterB = JourneyRankingService.rankJourneys([journeyA, journeyBFaster], "balanced");
    // Small detour does NOT make 38m journey worse than 40m journey
    expect(rankedWithFasterB[0].id).toBe("journey_B_faster_small_detour");
  });

  // CASE E — SAME METRICS (STABLE DETERMINISTIC TIE-BREAKING)
  test("CASE E — SAME METRICS: Equal candidate metrics produce invariant deterministic ordering", () => {
    const journey1 = createMockJourney({
      id: "journey_alpha",
      durationMinutes: 30,
      walkingMeters: 400,
      transfersCount: 0,
      backtrackingMeters: 0,
    });

    const journey2 = createMockJourney({
      id: "journey_beta",
      durationMinutes: 30,
      walkingMeters: 400,
      transfersCount: 0,
      backtrackingMeters: 0,
    });

    // Order [1, 2]
    const orderForward = JourneyRankingService.rankJourneys([journey1, journey2], "fastest");
    // Order [2, 1] (reversed input)
    const orderReversed = JourneyRankingService.rankJourneys([journey2, journey1], "fastest");

    // Must produce the exact same order regardless of input permutation
    expect(orderForward.map((j) => j.id)).toEqual(orderReversed.map((j) => j.id));
    expect(orderForward[0].id).toBe("journey_alpha");
    expect(orderForward[1].id).toBe("journey_beta");
  });

  // CASE F — UNAVAILABLE FARE
  test("CASE F — UNAVAILABLE FARE: Refuses to fabricate fares and reports fare unavailable explicitly", () => {
    const journey1 = createMockJourney({
      id: "journey_1",
      durationMinutes: 35,
      walkingMeters: 500,
      transfersCount: 0,
      fareStatus: "UNAVAILABLE",
    });

    const journey2 = createMockJourney({
      id: "journey_2",
      durationMinutes: 25,
      walkingMeters: 600,
      transfersCount: 0,
      fareStatus: "UNAVAILABLE",
    });

    const result = JourneyRankingService.rankWithDiagnostics([journey1, journey2], "cheapest");

    // 1. Diagnostics explicitly flags fareUnavailable
    expect(result.diagnostics.fareUnavailable).toBe(true);

    // 2. No fabricated fares or costs on any journey
    for (const j of result.journeys) {
      expect(j.trust.fare).toBe("UNAVAILABLE");
      // No false "Cheapest" claim
      expect(j.tag).not.toBe("Cheapest");
    }

    // 3. Candidate set is preserved without fabrication
    expect(result.journeys.length).toBe(2);
  });

  // CASE G — REAL BOLE -> PIASSA
  test("CASE G — REAL BOLE -> PIASSA: Evaluates all 40 journeys under every supported preference", async () => {
    const origin = { latitude: 8.9983386, longitude: 38.7860596 };
    const destination = { latitude: 9.0365871, longitude: 38.7522029 };
    const preferences = { maxWalkingMeters: 1000, maxTransfers: 1 };

    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin,
      destination,
      preferences,
    });
    const candidateJourneys = routerResult.journeys;

    expect(candidateJourneys.length).toBe(40);

    // Verify candidate set preservation: Every ranking MUST preserve exact same 40 journey IDs
    const originalIds = new Set(candidateJourneys.map((j) => j.id));

    // 1. FASTEST
    const fastestResult = JourneyRankingService.rankWithDiagnostics(candidateJourneys, "fastest");
    const fastestIds = new Set(fastestResult.journeys.map((j) => j.id));
    expect(fastestIds).toEqual(originalIds);
    expect(fastestResult.journeys.length).toBe(40);
    // First journey in fastest must have minimum duration
    const fastestDuration = fastestResult.journeys[0].estimatedDurationMinutes;
    expect(fastestDuration).toBe(21);
    expect(fastestResult.journeys[0].tag).toBe("Fastest");

    // Verify duration is non-decreasing across the entire list
    for (let i = 1; i < fastestResult.journeys.length; i++) {
      expect(fastestResult.journeys[i].estimatedDurationMinutes).toBeGreaterThanOrEqual(
        fastestResult.journeys[i - 1].estimatedDurationMinutes
      );
    }

    // 2. LEAST WALKING
    const leastWalkResult = JourneyRankingService.rankWithDiagnostics(candidateJourneys, "least_walking");
    const leastWalkIds = new Set(leastWalkResult.journeys.map((j) => j.id));
    expect(leastWalkIds).toEqual(originalIds);
    expect(leastWalkResult.journeys.length).toBe(40);
    const minWalkMeters = leastWalkResult.journeys[0].metrics!.totalWalkingMeters;
    expect(minWalkMeters).toBe(422);
    expect(leastWalkResult.journeys[0].tag).toBe("Least Walking");

    // Verify walking meters is non-decreasing across the entire list
    for (let i = 1; i < leastWalkResult.journeys.length; i++) {
      expect(leastWalkResult.journeys[i].metrics!.totalWalkingMeters).toBeGreaterThanOrEqual(
        leastWalkResult.journeys[i - 1].metrics!.totalWalkingMeters
      );
    }

    // 3. FEWEST TRANSFERS
    const fewestTransfersResult = JourneyRankingService.rankWithDiagnostics(candidateJourneys, "fewest_transfers");
    const fewestTransfersIds = new Set(fewestTransfersResult.journeys.map((j) => j.id));
    expect(fewestTransfersIds).toEqual(originalIds);
    expect(fewestTransfersResult.journeys.length).toBe(40);

    for (let i = 1; i < fewestTransfersResult.journeys.length; i++) {
      expect(fewestTransfersResult.journeys[i].transfersCount).toBeGreaterThanOrEqual(
        fewestTransfersResult.journeys[i - 1].transfersCount
      );
    }

    // 4. BALANCED
    const balancedResult = JourneyRankingService.rankWithDiagnostics(candidateJourneys, "balanced");
    const balancedIds = new Set(balancedResult.journeys.map((j) => j.id));
    expect(balancedIds).toEqual(originalIds);
    expect(balancedResult.journeys.length).toBe(40);
    expect(balancedResult.journeys[0].tag).toBe("Balanced");

    // 5. Performance benchmark
    console.log("=== Performance Measurements (40 Real Journeys) ===");
    console.log(`Metric calculation time : ${balancedResult.diagnostics.metricCalculationTimeMs.toFixed(3)} ms`);
    console.log(`Ranking computation time: ${balancedResult.diagnostics.rankingTimeMs.toFixed(3)} ms`);
    console.log(`Total ranking overhead  : ${balancedResult.diagnostics.totalRankingOverheadMs.toFixed(3)} ms`);

    expect(balancedResult.diagnostics.totalRankingOverheadMs).toBeLessThan(50); // Well under 50ms budget

    // Report resulting orderings without calling any single one "best"
    console.log("\n=== FASTEST ORDER (Top 3) ===");
    fastestResult.journeys.slice(0, 3).forEach((j, i) => {
      console.log(`  ${i + 1}. [${j.id}] ${j.estimatedDurationMinutes}m, walk ${j.metrics!.totalWalkingMeters}m`);
    });

    console.log("\n=== LEAST WALKING ORDER (Top 3) ===");
    leastWalkResult.journeys.slice(0, 3).forEach((j, i) => {
      console.log(`  ${i + 1}. [${j.id}] walk ${j.metrics!.totalWalkingMeters}m, ${j.estimatedDurationMinutes}m`);
    });

    console.log("\n=== FEWEST TRANSFERS ORDER (Top 3) ===");
    fewestTransfersResult.journeys.slice(0, 3).forEach((j, i) => {
      console.log(`  ${i + 1}. [${j.id}] ${j.transfersCount} transfers, ${j.estimatedDurationMinutes}m`);
    });

    console.log("\n=== DEFAULT / BALANCED ORDER (Top 3) ===");
    balancedResult.journeys.slice(0, 3).forEach((j, i) => {
      console.log(`  ${i + 1}. [${j.id}] ${j.estimatedDurationMinutes}m, walk ${j.metrics!.totalWalkingMeters}m, btrack ${Math.round(j.metrics!.totalBacktrackingMeters)}m`);
    });
  }, 60000);
});
