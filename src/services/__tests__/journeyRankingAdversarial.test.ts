import { describe, test, expect } from "bun:test";
import { Journey, Coordinate } from "@/types/journey";
import { JourneyMetrics } from "@/types/journeyMetrics";
import { JourneyRankingService } from "../journeyRanking";
import { RouterService } from "../router";

function createMockAdversarialJourney(params: {
  id: string;
  durationMinutes: number;
  walkingMeters: number;
  transfersCount: number;
  backtrackingMeters?: number;
  routeType?: number;
  routeShortName?: string;
  routeLongName?: string;
  fareStatus?: "UNAVAILABLE" | "ESTIMATED";
  metrics?: Partial<JourneyMetrics>;
}): Journey {
  const origin: Coordinate = { latitude: 8.9983, longitude: 38.7860 };
  const destination: Coordinate = { latitude: 9.0365, longitude: 38.7522 };

  const walk1 = Math.round(params.walkingMeters * 0.5);
  const walk2 = params.walkingMeters - walk1;

  const mockMetrics: JourneyMetrics = {
    totalWalkingMeters: params.walkingMeters,
    walkingBeforeFirstTransitMeters: walk1,
    walkingAfterLastTransitMeters: walk2,
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

  return {
    id: params.id,
    origin,
    destination,
    legs: [
      {
        type: "WALK",
        from: { name: "Origin", latitude: origin.latitude, longitude: origin.longitude },
        to: { name: "Stop 1", latitude: origin.latitude + 0.001, longitude: origin.longitude + 0.001 },
        distanceMeters: walk1,
        estimatedMinutes: Math.ceil(walk1 / 75),
      },
      {
        type: "TRANSIT",
        routeId: params.id + "_route",
        routeShortName: params.routeShortName || "MOCK",
        routeLongName: params.routeLongName || "Mock Line",
        routeType: params.routeType ?? 3,
        boardingStop: { id: "s1", name: "Stop 1", latitude: origin.latitude + 0.001, longitude: origin.longitude + 0.001 },
        alightingStop: { id: "s2", name: "Stop 2", latitude: destination.latitude - 0.001, longitude: destination.longitude - 0.001 },
        boardingSequence: 1,
        alightingSequence: 5,
        stopsCount: 4,
        orderedStops: [
          { id: "s1", name: "Stop 1", latitude: origin.latitude + 0.001, longitude: origin.longitude + 0.001, stopSequence: 1 },
          { id: "s2", name: "Stop 2", latitude: destination.latitude - 0.001, longitude: destination.longitude - 0.001, stopSequence: 5 },
        ],
      },
      {
        type: "WALK",
        from: { name: "Stop 2", latitude: destination.latitude - 0.001, longitude: destination.longitude - 0.001 },
        to: { name: "Destination", latitude: destination.latitude, longitude: destination.longitude },
        distanceMeters: walk2,
        estimatedMinutes: Math.ceil(walk2 / 75),
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
}

describe("Phase 3 Adversarial Ranking QA", () => {
  // CASE 1 — FASTEST VS WALKING
  test("CASE 1 — FASTEST VS WALKING: Primary duration dominance is preserved despite high walking", () => {
    // Journey A: 30 min, 1500m walking, 0 transfers
    const journeyA = createMockAdversarialJourney({
      id: "j_fast_heavy_walk",
      durationMinutes: 30,
      walkingMeters: 1500,
      transfersCount: 0,
    });

    // Journey B: 35 min, 200m walking, 0 transfers
    const journeyB = createMockAdversarialJourney({
      id: "j_slower_low_walk",
      durationMinutes: 35,
      walkingMeters: 200,
      transfersCount: 0,
    });

    // FASTEST must rank A first
    const fastest = JourneyRankingService.rankJourneys([journeyB, journeyA], "fastest");
    expect(fastest[0].id).toBe("j_fast_heavy_walk");
    expect(fastest[1].id).toBe("j_slower_low_walk");
    expect(fastest[0].tag).toBe("Fastest");
    expect(fastest[1].tag).toBe("Balanced");

    // LEAST WALKING must rank B first
    const leastWalk = JourneyRankingService.rankJourneys([journeyA, journeyB], "least_walking");
    expect(leastWalk[0].id).toBe("j_slower_low_walk");
    expect(leastWalk[1].id).toBe("j_fast_heavy_walk");
    expect(leastWalk[0].tag).toBe("Least Walking");
    expect(leastWalk[1].tag).toBe("Balanced");
  });

  // CASE 2 — WALKING VS DURATION
  test("CASE 2 — WALKING VS DURATION: Least walking strictly minimizes walking distance", () => {
    // Journey A: 25 min, 1400m walking
    const journeyA = createMockAdversarialJourney({
      id: "j_speedy_high_walk",
      durationMinutes: 25,
      walkingMeters: 1400,
      transfersCount: 0,
    });

    // Journey B: 45 min, 300m walking
    const journeyB = createMockAdversarialJourney({
      id: "j_leisurely_low_walk",
      durationMinutes: 45,
      walkingMeters: 300,
      transfersCount: 0,
    });

    const leastWalk = JourneyRankingService.rankJourneys([journeyA, journeyB], "least_walking");
    expect(leastWalk[0].id).toBe("j_leisurely_low_walk");
    expect(leastWalk[1].id).toBe("j_speedy_high_walk");

    const fastest = JourneyRankingService.rankJourneys([journeyB, journeyA], "fastest");
    expect(fastest[0].id).toBe("j_speedy_high_walk");
    expect(fastest[1].id).toBe("j_leisurely_low_walk");
  });

  // CASE 3 — TRANSFERS VS SPEED
  test("CASE 3 — TRANSFERS VS SPEED: Fewest transfers strictly favors direct route", () => {
    // Journey A: 50 min, 0 transfers
    const journeyA = createMockAdversarialJourney({
      id: "j_direct_slow",
      durationMinutes: 50,
      walkingMeters: 500,
      transfersCount: 0,
    });

    // Journey B: 30 min, 1 transfer
    const journeyB = createMockAdversarialJourney({
      id: "j_transfer_fast",
      durationMinutes: 30,
      walkingMeters: 500,
      transfersCount: 1,
    });

    // FEWEST TRANSFERS must rank A first
    const fewestTransfers = JourneyRankingService.rankJourneys([journeyB, journeyA], "fewest_transfers");
    expect(fewestTransfers[0].id).toBe("j_direct_slow");
    expect(fewestTransfers[1].id).toBe("j_transfer_fast");

    // FASTEST must rank B first
    const fastest = JourneyRankingService.rankJourneys([journeyA, journeyB], "fastest");
    expect(fastest[0].id).toBe("j_transfer_fast");
    expect(fastest[1].id).toBe("j_direct_slow");
  });

  // CASE 4 — BACKTRACKING CONTINUITY & SANITY
  test("CASE 4 — BACKTRACKING: Evaluates 0m, 50m, 150m, 500m, 1200m without discarding or hijacking", () => {
    const b0 = createMockAdversarialJourney({ id: "j_bt_0", durationMinutes: 30, walkingMeters: 400, transfersCount: 0, backtrackingMeters: 0 });
    const b50 = createMockAdversarialJourney({ id: "j_bt_50", durationMinutes: 30, walkingMeters: 400, transfersCount: 0, backtrackingMeters: 50 });
    const b150 = createMockAdversarialJourney({ id: "j_bt_150", durationMinutes: 30, walkingMeters: 400, transfersCount: 0, backtrackingMeters: 150 });
    const b500 = createMockAdversarialJourney({ id: "j_bt_500", durationMinutes: 30, walkingMeters: 400, transfersCount: 0, backtrackingMeters: 500 });
    const b1200 = createMockAdversarialJourney({ id: "j_bt_1200", durationMinutes: 30, walkingMeters: 400, transfersCount: 0, backtrackingMeters: 1200 });

    const allJourneys = [b1200, b500, b150, b50, b0];

    // 1. All valid journeys remain valid and present in output
    const rankedBalanced = JourneyRankingService.rankJourneys(allJourneys, "balanced");
    expect(rankedBalanced.length).toBe(5);
    const resultIds = new Set(rankedBalanced.map((j) => j.id));
    expect(resultIds.size).toBe(5);

    // 2. Backtracking penalties:
    // 0m, 50m, 150m have 0 excess penalty (cost = 30 + 20 + 0 = 50)
    expect(JourneyRankingService.calculateBalancedCost(b0)).toBe(50.0);
    expect(JourneyRankingService.calculateBalancedCost(b50)).toBe(50.0);
    expect(JourneyRankingService.calculateBalancedCost(b150)).toBe(50.0);

    // 500m has (500 - 150) * 0.02 = 7.0 pts penalty (cost = 57.0)
    expect(JourneyRankingService.calculateBalancedCost(b500)).toBe(57.0);

    // 1200m has (1200 - 150) * 0.02 = 21.0 pts penalty (cost = 71.0)
    expect(JourneyRankingService.calculateBalancedCost(b1200)).toBe(71.0);

    // b500 and b1200 must be at the tail in balanced ranking
    expect(rankedBalanced[3].id).toBe("j_bt_500");
    expect(rankedBalanced[4].id).toBe("j_bt_1200");

    // 3. Fastest is NOT hijacked by backtracking when durations differ
    const fasterWithBacktrack = createMockAdversarialJourney({
      id: "j_faster_bt",
      durationMinutes: 20,
      walkingMeters: 400,
      transfersCount: 0,
      backtrackingMeters: 500,
    });
    const rankedFastest = JourneyRankingService.rankJourneys([b0, fasterWithBacktrack], "fastest");
    expect(rankedFastest[0].id).toBe("j_faster_bt"); // 20m beats 30m despite 500m backtracking
  });

  // CASE 5 — DIRECT VS TRANSFER TRADE-OFFS
  test("CASE 5 — DIRECT VS TRANSFER: Explores trade-offs across all preferences", () => {
    // Journey A: direct, 40 min, 700m walking
    const journeyA = createMockAdversarialJourney({
      id: "j_direct_moderate",
      durationMinutes: 40,
      walkingMeters: 700,
      transfersCount: 0,
      backtrackingMeters: 0,
    });

    // Journey B: 1 transfer, 30 min, 300m walking
    const journeyB = createMockAdversarialJourney({
      id: "j_transfer_fast_low_walk",
      durationMinutes: 30,
      walkingMeters: 300,
      transfersCount: 1,
      backtrackingMeters: 0,
    });

    // FASTEST: B (30 min) beats A (40 min)
    expect(JourneyRankingService.rankJourneys([journeyA, journeyB], "fastest")[0].id).toBe("j_transfer_fast_low_walk");

    // LEAST WALKING: B (300m) beats A (700m)
    expect(JourneyRankingService.rankJourneys([journeyA, journeyB], "least_walking")[0].id).toBe("j_transfer_fast_low_walk");

    // FEWEST TRANSFERS: A (0 transfers) beats B (1 transfer)
    expect(JourneyRankingService.rankJourneys([journeyA, journeyB], "fewest_transfers")[0].id).toBe("j_direct_moderate");

    // BALANCED:
    // Cost A = 40 + (700 * 0.05) + 0 = 40 + 35 = 75
    // Cost B = 30 + (300 * 0.05) + 12 = 30 + 15 + 12 = 57
    // B beats A in balanced because saving 10m duration + 400m walk overcomes the 12pt transfer penalty
    expect(JourneyRankingService.rankJourneys([journeyA, journeyB], "balanced")[0].id).toBe("j_transfer_fast_low_walk");
  });

  // CASE 6 — MINIBUS VS BUS (NO HIDDEN MODE BIAS)
  test("CASE 6 — MINIBUS VS BUS: No hidden mode utility bias is injected into ranking", () => {
    // Equivalent journeys differing only in vehicle mode and ID
    const busJourney = createMockAdversarialJourney({
      id: "j_bus_mode",
      durationMinutes: 30,
      walkingMeters: 400,
      transfersCount: 0,
      routeShortName: "AB009",
      routeLongName: "Anbessa Bus",
      routeType: 3,
    });

    const minibusJourney = createMockAdversarialJourney({
      id: "j_minibus_mode",
      durationMinutes: 30,
      walkingMeters: 400,
      transfersCount: 0,
      routeShortName: "Tx Bole 019",
      routeLongName: "Minibus Taxi",
      routeType: 3,
    });

    // With identical duration, walk, transfers, backtracking:
    // Order is determined ONLY by deterministic stable ID tie-breaker
    const ranked1 = JourneyRankingService.rankJourneys([minibusJourney, busJourney], "balanced");
    const ranked2 = JourneyRankingService.rankJourneys([busJourney, minibusJourney], "balanced");

    expect(ranked1.map((j) => j.id)).toEqual(ranked2.map((j) => j.id));
    expect(ranked1[0].id).toBe("j_bus_mode"); // "j_bus_mode".localeCompare("j_minibus_mode") < 0
  });

  // CASE 7 — CHEAPEST UNAVAILABLE
  test("CASE 7 — CHEAPEST UNAVAILABLE: Transparently flags unavailability and creates no false claims", () => {
    const j1 = createMockAdversarialJourney({ id: "j1", durationMinutes: 20, walkingMeters: 300, transfersCount: 0 });
    const j2 = createMockAdversarialJourney({ id: "j2", durationMinutes: 35, walkingMeters: 200, transfersCount: 0 });

    const result = JourneyRankingService.rankWithDiagnostics([j1, j2], "cheapest");

    expect(result.diagnostics.fareUnavailable).toBe(true);
    expect(result.diagnostics.message).toContain("Fare data is unavailable");

    // All journeys must be preserved
    expect(result.journeys.length).toBe(2);

    // Zero journeys labeled "Cheapest"
    for (const j of result.journeys) {
      expect(j.tag).not.toBe("Cheapest");
      expect(j.trust.fare).toBe("UNAVAILABLE");
    }
  });

  // CASE 8 — IDENTICAL METRICS SHUFFLE RESILIENCE
  test("CASE 8 — IDENTICAL METRICS: Output order is 100% permutation-invariant", () => {
    const jAlpha = createMockAdversarialJourney({ id: "j_alpha", durationMinutes: 25, walkingMeters: 500, transfersCount: 0, backtrackingMeters: 0 });
    const jBeta = createMockAdversarialJourney({ id: "j_beta", durationMinutes: 25, walkingMeters: 500, transfersCount: 0, backtrackingMeters: 0 });
    const jGamma = createMockAdversarialJourney({ id: "j_gamma", durationMinutes: 25, walkingMeters: 500, transfersCount: 0, backtrackingMeters: 0 });

    // Permutations
    const p1 = [jAlpha, jBeta, jGamma];
    const p2 = [jGamma, jAlpha, jBeta];
    const p3 = [jBeta, jGamma, jAlpha];
    const p4 = [jGamma, jBeta, jAlpha];
    const p5 = [jAlpha, jGamma, jBeta];
    const p6 = [jBeta, jAlpha, jGamma];

    const expectedOrder = ["j_alpha", "j_beta", "j_gamma"];

    for (const perm of [p1, p2, p3, p4, p5, p6]) {
      const ranked = JourneyRankingService.rankJourneys(perm, "fastest");
      expect(ranked.map((j) => j.id)).toEqual(expectedOrder);
    }
  });

  // CASE 9 — REAL BOLE -> PIASSA DEEP AUDIT
  test("CASE 9 — REAL BOLE -> PIASSA: Deep audit over real 40 candidates", async () => {
    const origin = { latitude: 8.9983386, longitude: 38.7860596 };
    const destination = { latitude: 9.0365871, longitude: 38.7522029 };
    const preferences = { maxWalkingMeters: 1000, maxTransfers: 1 };

    const routerResult = await RouterService.findJourneysWithDiagnostics({ origin, destination, preferences });
    const rawCandidates = routerResult.journeys;
    expect(rawCandidates.length).toBe(40);

    const originalIdSet = new Set(rawCandidates.map((j) => j.id));

    // Audit for every preference:
    const prefs = ["fastest", "least_walking", "fewest_transfers", "balanced", "cheapest"] as const;

    for (const pref of prefs) {
      const res = JourneyRankingService.rankWithDiagnostics(rawCandidates, pref);
      expect(res.journeys.length).toBe(40);
      const rankedIdSet = new Set(res.journeys.map((j) => j.id));
      expect(rankedIdSet).toEqual(originalIdSet);

      // Verify no factual corruption
      for (const j of res.journeys) {
        expect(j.trust.transit).toBe("VERIFIED");
        expect(j.trust.fare).toBe("UNAVAILABLE");
        expect(j.legs.length).toBeGreaterThanOrEqual(3);
      }
    }

    // Record top 5 for each preference
    const fastest = JourneyRankingService.rankJourneys(rawCandidates, "fastest");
    const leastWalk = JourneyRankingService.rankJourneys(rawCandidates, "least_walking");
    const fewestTransfers = JourneyRankingService.rankJourneys(rawCandidates, "fewest_transfers");
    const balanced = JourneyRankingService.rankJourneys(rawCandidates, "balanced");

    console.log("\n=== REAL BOLE -> PIASSA TOP 5 ===");
    console.log("FASTEST Top 5:");
    fastest.slice(0, 5).forEach((j, i) => console.log(`  ${i + 1}. [${j.id}] ${j.estimatedDurationMinutes}m, walk: ${j.metrics!.totalWalkingMeters}m`));

    console.log("LEAST WALKING Top 5:");
    leastWalk.slice(0, 5).forEach((j, i) => console.log(`  ${i + 1}. [${j.id}] walk: ${j.metrics!.totalWalkingMeters}m, dur: ${j.estimatedDurationMinutes}m`));

    console.log("FEWEST TRANSFERS Top 5:");
    fewestTransfers.slice(0, 5).forEach((j, i) => console.log(`  ${i + 1}. [${j.id}] transfers: ${j.transfersCount}, dur: ${j.estimatedDurationMinutes}m`));

    console.log("BALANCED Top 5:");
    balanced.slice(0, 5).forEach((j, i) => console.log(`  ${i + 1}. [${j.id}] dur: ${j.estimatedDurationMinutes}m, walk: ${j.metrics!.totalWalkingMeters}m, btrack: ${Math.round(j.metrics!.totalBacktrackingMeters)}m, score: ${JourneyRankingService.calculateBalancedCost(j).toFixed(2)}`));

    // Confirm that fastest duration is non-decreasing
    for (let i = 1; i < fastest.length; i++) {
      expect(fastest[i].estimatedDurationMinutes).toBeGreaterThanOrEqual(fastest[i - 1].estimatedDurationMinutes);
    }

    // Confirm that least walking walk meters is non-decreasing
    for (let i = 1; i < leastWalk.length; i++) {
      expect(leastWalk[i].metrics!.totalWalkingMeters).toBeGreaterThanOrEqual(leastWalk[i - 1].metrics!.totalWalkingMeters);
    }
  }, 60000);

  // CASE 10 — SECOND REAL OD (MEXICO SQUARE -> PIASSA: 145 CANDIDATE JOURNEYS)
  test("CASE 10 — SECOND REAL OD (MEXICO -> PIASSA): Scaling to 145 candidate journeys", async () => {
    const origin = { latitude: 9.0105, longitude: 38.7454 }; // Mexico Square
    const destination = { latitude: 9.0345, longitude: 38.7525 }; // Piassa Arada
    const preferences = { maxWalkingMeters: 1000, maxTransfers: 1 };

    const routerResult = await RouterService.findJourneysWithDiagnostics({ origin, destination, preferences });
    const rawCandidates = routerResult.journeys;
    expect(rawCandidates.length).toBeGreaterThan(50); // Real corridor returns 145 journeys

    const originalIdSet = new Set(rawCandidates.map((j) => j.id));

    // Measure ranking overhead on large candidate set (>100 journeys)
    const rankingStart = performance.now();
    const rankedBalanced = JourneyRankingService.rankWithDiagnostics(rawCandidates, "balanced");
    const rankingDuration = performance.now() - rankingStart;

    console.log(`\n=== SECOND REAL OD (MEXICO -> PIASSA: ${rawCandidates.length} CANDIDATES) ===`);
    console.log(`Ranking overhead for ${rawCandidates.length} journeys: ${rankingDuration.toFixed(3)} ms`);

    // Verify candidate set preservation
    expect(rankedBalanced.journeys.length).toBe(rawCandidates.length);
    const rankedIdSet = new Set(rankedBalanced.journeys.map((j) => j.id));
    expect(rankedIdSet).toEqual(originalIdSet);

    // Verify fastest ordering
    const rankedFastest = JourneyRankingService.rankJourneys(rawCandidates, "fastest");
    expect(rankedFastest[0].estimatedDurationMinutes).toBeLessThanOrEqual(rankedFastest[rankedFastest.length - 1].estimatedDurationMinutes);
    for (let i = 1; i < rankedFastest.length; i++) {
      expect(rankedFastest[i].estimatedDurationMinutes).toBeGreaterThanOrEqual(rankedFastest[i - 1].estimatedDurationMinutes);
    }

    // Verify least walking ordering
    const rankedLeastWalk = JourneyRankingService.rankJourneys(rawCandidates, "least_walking");
    for (let i = 1; i < rankedLeastWalk.length; i++) {
      expect(rankedLeastWalk[i].metrics!.totalWalkingMeters).toBeGreaterThanOrEqual(rankedLeastWalk[i - 1].metrics!.totalWalkingMeters);
    }
  }, 60000);
});
