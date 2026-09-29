import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Journey, Coordinate } from "@/types/journey";
import { JourneyMetrics } from "@/types/journeyMetrics";
import { JEVService } from "../jevService";
import { JourneyMetricsService } from "../journeyMetrics";
import { JourneyRankingService } from "../journeyRanking";
import { RouterService } from "../router";

function createMockJourney(params: {
  id: string;
  durationMinutes: number;
  walkingMeters: number;
  transfersCount: number;
  backtrackingMeters?: number;
  origin?: Coordinate;
  destination?: Coordinate;
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
        distanceMeters: 5000,
        estimatedMinutes: params.durationMinutes - Math.ceil(params.walkingMeters / 75),
        intermediateStops: [],
      },
      {
        type: "WALK",
        from: { name: "Alighting Stop", latitude: destination.latitude - 0.001, longitude: destination.longitude - 0.001 },
        to: { name: "Destination", latitude: destination.latitude, longitude: destination.longitude },
        distanceMeters: walkLeg2Distance,
        estimatedMinutes: Math.ceil(walkLeg2Distance / 75),
      },
    ],
    totalDistanceMeters: 5000 + params.walkingMeters,
    estimatedDurationMinutes: params.durationMinutes,
    transfersCount: params.transfersCount,
    fare: {
      amount: 0,
      currency: "ETB",
      status: "UNAVAILABLE",
    },
    metrics: mockMetrics,
  };

  return journey;
}

/**
 * Creates a mock fetch function that responds with JEV System 1 JSON
 */
function createMockFetch(selectedChoice: string, confidence: number = 0.92) {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const responseBody = {
      model: "typesafe/jev-1.13",
      answers: {
        selectedJourney: {
          type: "choice",
          choice: selectedChoice,
          confidence,
          probabilities: { [selectedChoice]: confidence },
        },
      },
      usage: {
        input_tokens: 150,
        output_tokens: 20,
      },
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

describe("Phase 4: JEV Integration Unit & Adversarial Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "sk-or-test-mock-key";
    delete process.env.TYPESAFE_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("Client Configuration: Successfully detects OpenRouter environment and configures gateway", () => {
    const client = JEVService.createClient();
    expect(client).not.toBeNull();
    expect(client?.baseURL).toBe("https://openrouter.ai/api");
    expect(client?.defaultModel).toBe("typesafe/jev-1.13");
    expect(client?.defaultHeaders["HTTP-Referer"]).toBe("https://menged.app");
    expect(client?.defaultHeaders["X-Title"]).toBe("Menged Transit Engine");
  });

  test("Client Configuration: Successfully configures TypeSafe native when TYPESAFE_API_KEY is provided", () => {
    process.env.TYPESAFE_API_KEY = "ts-test-key";
    delete process.env.OPENROUTER_API_KEY;

    const client = JEVService.createClient();
    expect(client).not.toBeNull();
    expect(client?.baseURL).toBe("https://api.typesafe.ai");
    expect(client?.defaultModel).toBe("jev-latest");
  });

  test("Client Configuration: Returns null safely if no API key is configured", () => {
    delete process.env.TYPESAFE_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const client = JEVService.createClient();
    expect(client).toBeNull();
  });

  test("Candidate Serialization: Strictly marks fare and realtime as UNAVAILABLE", () => {
    const journey = createMockJourney({
      id: "j-candidate-test",
      durationMinutes: 25,
      walkingMeters: 400,
      transfersCount: 0,
      backtrackingMeters: 0,
    });

    const candidate = JEVService.toCandidateForJEV(journey);
    expect(candidate.journeyId).toBe("j-candidate-test");
    expect(candidate.fareStatus).toBe("UNAVAILABLE");
    expect(candidate.realtimeStatus).toBe("UNAVAILABLE");
    expect(candidate.totalWalkingMeters).toBe(400);
    expect(candidate.estimatedDurationMinutes).toBe(25);
  });

  test("CASE A — FASTEST: JEV selects the fastest candidate and preserves candidate set", async () => {
    const j1 = createMockJourney({ id: "j_fast", durationMinutes: 20, walkingMeters: 600, transfersCount: 0 });
    const j2 = createMockJourney({ id: "j_walk", durationMinutes: 28, walkingMeters: 300, transfersCount: 0 });
    const candidates = [j2, j1];

    const mockFetch = createMockFetch("j_fast", 0.95);
    const result = await JEVService.evaluateJourneys(
      candidates,
      { preference: "fastest" },
      { fetch: mockFetch }
    );

    expect(result.decision.selectedJourneyId).toBe("j_fast");
    expect(result.decision.confidence).toBe(0.95);
    expect(result.decision.fallbackUsed).toBe(false);
    expect(result.journeys[0].id).toBe("j_fast");
    expect(result.journeys.length).toBe(2);
    expect(new Set(result.journeys.map((j) => j.id))).toEqual(new Set(["j_fast", "j_walk"]));
    expect(result.diagnostics.fareUnavailable).toBe(true);
    expect(result.diagnostics.realtimeUnavailable).toBe(true);
  });

  test("CASE B — LEAST WALKING: JEV selects the candidate with minimal walking", async () => {
    const j1 = createMockJourney({ id: "j_fast", durationMinutes: 20, walkingMeters: 800, transfersCount: 0 });
    const j2 = createMockJourney({ id: "j_low_walk", durationMinutes: 26, walkingMeters: 250, transfersCount: 0 });
    const candidates = [j1, j2];

    const mockFetch = createMockFetch("j_low_walk", 0.93);
    const result = await JEVService.evaluateJourneys(
      candidates,
      { preference: "least_walking" },
      { fetch: mockFetch }
    );

    expect(result.decision.selectedJourneyId).toBe("j_low_walk");
    expect(result.journeys[0].id).toBe("j_low_walk");
    expect(result.journeys.length).toBe(2);
    expect(result.decision.fallbackUsed).toBe(false);
  });

  test("CASE C — FEWEST TRANSFERS: JEV selects zero-transfer direct journey over faster transfer route", async () => {
    const jTransfer = createMockJourney({ id: "j_transfer", durationMinutes: 22, walkingMeters: 300, transfersCount: 1 });
    const jDirect = createMockJourney({ id: "j_direct", durationMinutes: 30, walkingMeters: 400, transfersCount: 0 });
    const candidates = [jTransfer, jDirect];

    const mockFetch = createMockFetch("j_direct", 0.96);
    const result = await JEVService.evaluateJourneys(
      candidates,
      { preference: "fewest_transfers" },
      { fetch: mockFetch }
    );

    expect(result.decision.selectedJourneyId).toBe("j_direct");
    expect(result.journeys[0].id).toBe("j_direct");
    expect(result.decision.fallbackUsed).toBe(false);
  });

  test("CASE D — BALANCED: Evaluates trade-offs without corrupting metrics", async () => {
    const j1 = createMockJourney({ id: "j1", durationMinutes: 23, walkingMeters: 467, transfersCount: 0, backtrackingMeters: 3 });
    const j2 = createMockJourney({ id: "j2", durationMinutes: 21, walkingMeters: 602, transfersCount: 0, backtrackingMeters: 3 });
    const candidates = [j1, j2];

    const mockFetch = createMockFetch("j1", 0.88);
    const result = await JEVService.evaluateJourneys(
      candidates,
      { preference: "balanced" },
      { fetch: mockFetch }
    );

    expect(result.decision.selectedJourneyId).toBe("j1");
    expect(result.journeys[0].id).toBe("j1");
    // Verify metrics remain completely untouched
    expect(result.journeys[0].metrics?.totalBacktrackingMeters).toBe(3);
    expect(result.journeys[0].metrics?.totalWalkingMeters).toBe(467);
  });

  test("CASE E — BACKTRACKING: Handles high backtracking without candidate dropping", async () => {
    const jLowBacktrack = createMockJourney({ id: "j_clean", durationMinutes: 30, walkingMeters: 400, transfersCount: 0, backtrackingMeters: 20 });
    const jHighBacktrack = createMockJourney({ id: "j_detour", durationMinutes: 29, walkingMeters: 410, transfersCount: 0, backtrackingMeters: 800 });
    const candidates = [jHighBacktrack, jLowBacktrack];

    const mockFetch = createMockFetch("j_clean", 0.90);
    const result = await JEVService.evaluateJourneys(
      candidates,
      { preference: "balanced" },
      { fetch: mockFetch }
    );

    expect(result.decision.selectedJourneyId).toBe("j_clean");
    expect(result.journeys.length).toBe(2);
    expect(result.journeys[0].id).toBe("j_clean");
    expect(result.journeys[1].id).toBe("j_detour");
  });

  test("CASE F — CHEAPEST UNAVAILABLE: Never invokes external model, returns balanced fallback with truthful diagnosis", async () => {
    const j1 = createMockJourney({ id: "j1", durationMinutes: 25, walkingMeters: 400, transfersCount: 0 });
    const j2 = createMockJourney({ id: "j2", durationMinutes: 30, walkingMeters: 300, transfersCount: 0 });
    const candidates = [j1, j2];

    let fetchCalled = false;
    const mockFetch = async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    };

    const result = await JEVService.evaluateJourneys(
      candidates,
      { preference: "cheapest" },
      { fetch: mockFetch }
    );

    expect(fetchCalled).toBe(false);
    expect(result.decision.fallbackUsed).toBe(true);
    expect(result.decision.reason).toContain("Fare information is unavailable");
    expect(result.diagnostics.fareUnavailable).toBe(true);
    expect(result.diagnostics.provider).toBe("deterministic_fallback");
  });

  test("CASE G — UNKNOWN ID REJECTION: Gracefully falls back if model returns a non-existent candidate ID", async () => {
    const j1 = createMockJourney({ id: "valid_journey_1", durationMinutes: 25, walkingMeters: 400, transfersCount: 0 });
    const j2 = createMockJourney({ id: "valid_journey_2", durationMinutes: 30, walkingMeters: 300, transfersCount: 0 });
    const candidates = [j1, j2];

    const mockFetch = createMockFetch("hallucinated_journey_999", 0.99);
    const result = await JEVService.evaluateJourneys(
      candidates,
      { preference: "fastest" },
      { fetch: mockFetch }
    );

    expect(result.decision.fallbackUsed).toBe(true);
    expect(result.decision.fallbackReason).toContain("unknown journey ID: 'hallucinated_journey_999'");
    expect(result.decision.selectedJourneyId).toBe("valid_journey_1");
    expect(result.journeys.length).toBe(2);
  });

  test("CASE H — MALFORMED OUTPUT: Gracefully falls back on unexpected JSON response", async () => {
    const j1 = createMockJourney({ id: "j1", durationMinutes: 25, walkingMeters: 400, transfersCount: 0 });
    const candidates = [j1];

    const mockFetch = async () => {
      return new Response(JSON.stringify({ answers: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await JEVService.evaluateJourneys(
      candidates,
      { preference: "fastest" },
      { fetch: mockFetch }
    );

    expect(result.decision.fallbackUsed).toBe(true);
    expect(result.journeys[0].id).toBe("j1");
  });

  test("CASE I — TIMEOUT & API ERROR: Gracefully falls back on HTTP 500 or network drop", async () => {
    const j1 = createMockJourney({ id: "j1", durationMinutes: 25, walkingMeters: 400, transfersCount: 0 });
    const candidates = [j1];

    const mockFetch = async () => {
      return new Response("Internal Server Error", { status: 500 });
    };

    const result = await JEVService.evaluateJourneys(
      candidates,
      { preference: "fastest" },
      { fetch: mockFetch }
    );

    expect(result.decision.fallbackUsed).toBe(true);
    expect(result.decision.fallbackReason).toContain("JEV call failed");
    expect(result.journeys[0].id).toBe("j1");
  });

  test("Explanation Grounding Check: Sanitizes fake fares and fake live vehicle arrivals", () => {
    expect(JEVService.validateAndSanitizeExplanation("Selected because it costs 10 Birr")).toBeUndefined();
    expect(JEVService.validateAndSanitizeExplanation("Bus is arriving in 5 mins")).toBeUndefined();
    expect(JEVService.validateAndSanitizeExplanation("This route has least walking and zero transfers.")).toBe(
      "This route has least walking and zero transfers."
    );
  });

  test("CASE J — REAL BOLE -> PIASSA (40 Candidates): Candidate set strictly preserved", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 8.9983386, longitude: 38.7860596 }, // Bole Medhanialem
      destination: { latitude: 9.0365871, longitude: 38.7522029 }, // Piassa
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    const rawJourneys = routerResult.journeys;

    expect(rawJourneys.length).toBe(40);

    // Pick the 3rd journey as JEV's selection to test reordering
    const targetSelected = rawJourneys[2];
    const mockFetch = createMockFetch(targetSelected.id, 0.94);

    const result = await JEVService.evaluateJourneys(
      rawJourneys,
      { preference: "balanced" },
      { fetch: mockFetch }
    );

    expect(result.decision.fallbackUsed).toBe(false);
    expect(result.decision.selectedJourneyId).toBe(targetSelected.id);
    expect(result.journeys[0].id).toBe(targetSelected.id);
    expect(result.journeys.length).toBe(40);

    // Invariant: candidate set is 100% preserved
    const inIds = new Set(rawJourneys.map((j) => j.id));
    const outIds = new Set(result.journeys.map((j) => j.id));
    expect(outIds).toEqual(inIds);
  });

  test("CASE K — SECOND REAL OD (MEXICO -> PIASSA: 145 Candidates): Scaling and preservation verified", async () => {
    const routerResult = await RouterService.findJourneysWithDiagnostics({
      origin: { latitude: 9.0105, longitude: 38.7454 }, // Mexico Square
      destination: { latitude: 9.0345, longitude: 38.7525 }, // Piassa Arada
      preferences: { maxTransfers: 1, maxWalkingMeters: 1000 },
    });
    const rawJourneys = routerResult.journeys;

    expect(rawJourneys.length).toBe(145);

    const targetSelected = rawJourneys[10];
    const mockFetch = createMockFetch(targetSelected.id, 0.91);

    const start = performance.now();
    const result = await JEVService.evaluateJourneys(
      rawJourneys,
      { preference: "fastest" },
      { fetch: mockFetch }
    );
    const duration = performance.now() - start;

    expect(result.decision.fallbackUsed).toBe(false);
    expect(result.decision.selectedJourneyId).toBe(targetSelected.id);
    expect(result.journeys[0].id).toBe(targetSelected.id);
    expect(result.journeys.length).toBe(145);

    const inIds = new Set(rawJourneys.map((j) => j.id));
    const outIds = new Set(result.journeys.map((j) => j.id));
    expect(outIds).toEqual(inIds);

    console.log(`JEV evaluation over 145 journeys completed in ${duration.toFixed(2)}ms`);
  });
});
