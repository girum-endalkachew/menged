import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { Journey } from "@/types/journey";
import {
  JourneyCandidateForJEV,
  JEVUserContext,
  JEVJourneyDecision,
  JEVResult,
} from "@/types/jev";
import { JourneyMetricsService } from "./journeyMetrics";
import { JourneyRankingService } from "./journeyRanking";
import { classifyRouteTransportMode } from "@/lib/journeyAdapter";

export interface JEVServiceConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
  fetch?: typeof fetch;
}

export class JEVService {
  private static defaultTimeoutMs = 2500;

  /**
   * Converts a verified Journey and its metrics into a trusted, narrow candidate representation for JEV.
   * Strictly marks fare and realtime as UNAVAILABLE to prevent hallucination.
   */
  public static toCandidateForJEV(journey: Journey): JourneyCandidateForJEV {
    const m = journey.metrics || JourneyMetricsService.calculateMetrics(journey);
    const transitLegs = journey.legs.filter((l): l is import("@/types/journey").TransitLeg => l.type === "TRANSIT");
    const firstTransit = transitLegs[0];
    const lastTransit = transitLegs[transitLegs.length - 1];

    const modes = transitLegs.map((l) => {
      const cat = classifyRouteTransportMode(l);
      return cat === "lrt" ? "LRT" : cat === "minibus" ? "Minibus Taxi" : "Bus";
    });

    const routeIdentifiers = transitLegs
      .map((l) => l.routeShortName || l.routeLongName || l.routeId)
      .filter(Boolean);

    return {
      journeyId: journey.id,
      estimatedDurationMinutes: journey.estimatedDurationMinutes,
      totalWalkingMeters: m.totalWalkingMeters,
      walkingBeforeFirstTransitMeters: m.walkingBeforeFirstTransitMeters,
      walkingAfterLastTransitMeters: m.walkingAfterLastTransitMeters,
      transfersCount: journey.transfersCount,
      transitLegsCount: m.transitLegsCount,
      transitDistanceMeters: Math.round(m.transitDistanceMeters),
      journeyGeometryDistanceMeters: Math.round(m.journeyGeometryDistanceMeters),
      totalBacktrackingMeters: Math.round(m.totalBacktrackingMeters),
      destinationProgressRatio: Number(m.destinationProgressRatio.toFixed(3)),
      initialDirectionAlignment: Number(m.initialDirectionAlignment.toFixed(3)),
      modes: [...new Set(modes)],
      routeIdentifiers,
      boardingStop: firstTransit?.boardingStop.name || "Origin Stop",
      alightingStop: lastTransit?.alightingStop.name || "Destination Stop",
      fareStatus: "UNAVAILABLE",
      realtimeStatus: "UNAVAILABLE",
    };
  }

  /**
   * Creates an instance of TypeSafeClient configured for either OpenRouter or TypeSafe AI.
   */
  public static createClient(config?: JEVServiceConfig): TypeSafeClient | null {
    const apiKey =
      config?.apiKey ||
      process.env.TYPESAFE_API_KEY ||
      process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return null;
    }

    const isOpenRouter = !!process.env.OPENROUTER_API_KEY && !process.env.TYPESAFE_API_KEY;
    const baseURL =
      config?.baseURL ||
      process.env.TYPESAFE_BASE_URL ||
      (isOpenRouter ? "https://openrouter.ai/api" : "https://api.typesafe.ai");

    const defaultModel =
      config?.defaultModel ||
      process.env.TYPESAFE_DEFAULT_MODEL ||
      (isOpenRouter ? "typesafe/jev-1.13" : "jev-latest");

    const timeout = config?.timeout || this.defaultTimeoutMs;

    const defaultHeaders = isOpenRouter
      ? {
          "HTTP-Referer": "https://menged.app",
          "X-Title": "Menged Transit Engine",
        }
      : undefined;

    return new TypeSafeClient({
      apiKey,
      baseURL,
      defaultModel,
      timeout,
      defaultHeaders,
      fetch: config?.fetch,
    });
  }

  /**
   * Sanitizes explanation text to ensure no ungrounded claims (e.g. fake fares, live vehicle tracking) leak into output.
   */
  public static validateAndSanitizeExplanation(reason?: string): string | undefined {
    if (!reason) return undefined;
    const lower = reason.toLowerCase();

    // Check for fake fare hallucinations
    if (lower.includes("birr") || lower.includes("etb") || lower.includes("cost") || lower.includes("cheaper")) {
      return undefined;
    }

    // Check for fake realtime arrival hallucinations
    if (lower.includes("arriving in") || lower.includes("delayed by") || lower.includes("is approaching")) {
      return undefined;
    }

    return reason.trim();
  }

  /**
   * Evaluates verified GTFS candidate journeys using JEV (System 1 model).
   * 
   * Invariants:
   * 1. Router must already have verified candidate validity.
   * 2. Candidate set is strictly preserved: Set(in) === Set(out).
   * 3. On any failure, timeout, unknown ID, or missing API key, safely falls back to JourneyRankingService.
   */
  public static async evaluateJourneys(
    candidateJourneys: Journey[],
    userContext: JEVUserContext = {},
    config?: JEVServiceConfig
  ): Promise<JEVResult> {
    const startTime = performance.now();
    const preference = userContext.preference || "balanced";

    // 1. Ensure metrics exist on all candidates
    for (const j of candidateJourneys) {
      if (!j.metrics) {
        j.metrics = JourneyMetricsService.calculateMetrics(j);
      }
    }

    // 2. Pre-calculate deterministic ranking for stable fallback and relative ordering
    const deterministicRanked = JourneyRankingService.rankJourneys(candidateJourneys, preference);
    const candidateIdMap = new Map(candidateJourneys.map((j) => [j.id, j]));

    if (candidateJourneys.length === 0) {
      return {
        journeys: [],
        decision: {
          selectedJourneyId: "",
          rankedJourneyIds: [],
          confidence: 1.0,
          fallbackUsed: false,
        },
        diagnostics: {
          executionTimeMs: performance.now() - startTime,
          provider: "deterministic_fallback",
          candidateCount: 0,
          fareUnavailable: true,
          realtimeUnavailable: true,
        },
      };
    }

    // If preference is explicitly "cheapest", fare is UNAVAILABLE: JEV must NOT fabricate prices
    if (preference === "cheapest") {
      return {
        journeys: deterministicRanked,
        decision: {
          selectedJourneyId: deterministicRanked[0].id,
          rankedJourneyIds: deterministicRanked.map((j) => j.id),
          confidence: 1.0,
          reason: "Fare information is unavailable in the GTFS dataset; preserved balanced ordering without fabricating costs.",
          fallbackUsed: true,
          fallbackReason: "Fare data unavailable in GTFS static dataset.",
        },
        diagnostics: {
          executionTimeMs: performance.now() - startTime,
          provider: "deterministic_fallback",
          candidateCount: candidateJourneys.length,
          fareUnavailable: true,
          realtimeUnavailable: true,
        },
      };
    }

    // 3. Initialize TypeSafe/JEV client
    const client = this.createClient(config);
    if (!client) {
      // Clean fallback when API key is not configured
      return {
        journeys: deterministicRanked,
        decision: {
          selectedJourneyId: deterministicRanked[0].id,
          rankedJourneyIds: deterministicRanked.map((j) => j.id),
          confidence: 1.0,
          fallbackUsed: true,
          fallbackReason: "JEV client unconfigured (no TYPESAFE_API_KEY or OPENROUTER_API_KEY found); fell back to deterministic ranking.",
        },
        diagnostics: {
          executionTimeMs: performance.now() - startTime,
          provider: "deterministic_fallback",
          candidateCount: candidateJourneys.length,
          fareUnavailable: true,
          realtimeUnavailable: true,
        },
      };
    }

    // 4. Construct narrow, factual state and choices for JEV
    const jevCandidates = candidateJourneys.map((j) => this.toCandidateForJEV(j));
    const choicesRecord: Record<string, string> = {};

    for (const c of jevCandidates) {
      choicesRecord[c.journeyId] = `${c.estimatedDurationMinutes}m duration, ${c.totalWalkingMeters}m walk, ${c.transfersCount} transfers, backtracking ${c.totalBacktrackingMeters}m, modes: [${c.modes.join(", ")}]`;
    }

    const provider: "jev_openrouter" | "jev_typesafe" =
      process.env.OPENROUTER_API_KEY && !process.env.TYPESAFE_API_KEY
        ? "jev_openrouter"
        : "jev_typesafe";

    try {
      const response = await client.systemOne(
        {
          state: {
            userPreference: preference,
            userContext: userContext.context || {},
            verifiedCandidates: jevCandidates,
            fareTruth: "UNAVAILABLE",
            realtimeTruth: "UNAVAILABLE",
          } as any,
          questions: {
            selectedJourney: choice(
              "Select the journey ID that best satisfies the user preference based strictly on the provided factual metrics.",
              choicesRecord
            ),
          },
        },
        { timeout: config?.timeout || this.defaultTimeoutMs }
      );

      const selectedId = response.answers.selectedJourney.choice;
      const confidence = response.answers.selectedJourney.confidence || 0.85;

      // 5. VALIDATION BOUNDARY: Verify that JEV selected an existing, valid candidate
      if (!selectedId || !candidateIdMap.has(selectedId)) {
        console.warn(`[JEVService] JEV returned unknown or missing journey ID '${selectedId}'. Falling back safely.`);
        return {
          journeys: deterministicRanked,
          decision: {
            selectedJourneyId: deterministicRanked[0].id,
            rankedJourneyIds: deterministicRanked.map((j) => j.id),
            confidence: 1.0,
            fallbackUsed: true,
            fallbackReason: `JEV returned unknown journey ID: '${selectedId}'.`,
          },
          diagnostics: {
            executionTimeMs: performance.now() - startTime,
            provider: "deterministic_fallback",
            candidateCount: candidateJourneys.length,
            fareUnavailable: true,
            realtimeUnavailable: true,
          },
        };
      }

      // 6. CANDIDATE-SET PRESERVATION:
      // Place JEV's selected journey first, followed by all remaining valid candidates
      const selectedJourney = candidateIdMap.get(selectedId)!;
      const remaining = deterministicRanked.filter((j) => j.id !== selectedId);
      const orderedJourneys: Journey[] = [selectedJourney, ...remaining];

      return {
        journeys: orderedJourneys,
        decision: {
          selectedJourneyId: selectedId,
          rankedJourneyIds: orderedJourneys.map((j) => j.id),
          confidence,
          fallbackUsed: false,
        },
        diagnostics: {
          executionTimeMs: performance.now() - startTime,
          provider,
          model: response.model,
          candidateCount: candidateJourneys.length,
          fareUnavailable: true,
          realtimeUnavailable: true,
        },
      };
    } catch (err: any) {
      console.warn(`[JEVService] JEV invocation failed: ${err?.message || "Error"}. Safely falling back to deterministic ranking.`);
      return {
        journeys: deterministicRanked,
        decision: {
          selectedJourneyId: deterministicRanked[0].id,
          rankedJourneyIds: deterministicRanked.map((j) => j.id),
          confidence: 1.0,
          fallbackUsed: true,
          fallbackReason: `JEV call failed: ${err?.message || "Unknown error"}`,
        },
        diagnostics: {
          executionTimeMs: performance.now() - startTime,
          provider: "deterministic_fallback",
          candidateCount: candidateJourneys.length,
          fareUnavailable: true,
          realtimeUnavailable: true,
        },
      };
    }
  }
}
