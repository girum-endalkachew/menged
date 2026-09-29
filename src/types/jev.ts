import { Journey } from "./journey";
import { JourneyRankingPreference } from "./journeyRanking";

/**
 * Narrow, decision-relevant representation of a verified GTFS candidate journey sent to JEV.
 * Contains only trusted, deterministic facts computed by RouterService and JourneyMetricsService.
 * Never includes ungrounded claims, raw database credentials, or internal query structures.
 */
export interface JourneyCandidateForJEV {
  journeyId: string;
  estimatedDurationMinutes: number;
  totalWalkingMeters: number;
  walkingBeforeFirstTransitMeters: number;
  walkingAfterLastTransitMeters: number;
  transfersCount: number;
  transitLegsCount: number;
  transitDistanceMeters: number;
  journeyGeometryDistanceMeters: number;
  totalBacktrackingMeters: number;
  destinationProgressRatio: number;
  initialDirectionAlignment: number;
  modes: string[];
  routeIdentifiers: string[];
  boardingStop: string;
  alightingStop: string;
  fareStatus: "UNAVAILABLE";
  realtimeStatus: "UNAVAILABLE";
}

/**
 * User intent and contextual factors for JEV evaluation.
 */
export interface JEVUserContext {
  preference?: JourneyRankingPreference;
  context?: {
    luggage?: boolean;
    mobilityRestricted?: boolean;
    avoidBacktracking?: boolean;
    weather?: "rain" | "clear" | "hot";
    timeOfDay?: string;
  };
  queryText?: string;
}

/**
 * Structured decision returned by JEV (or fallback) after evaluating verified candidates.
 */
export interface JEVJourneyDecision {
  selectedJourneyId: string;
  rankedJourneyIds: string[];
  confidence: number;
  reason?: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

/**
 * Complete JEV evaluation result containing ordered journeys and execution metadata.
 */
export interface JEVResult {
  journeys: Journey[];
  decision: JEVJourneyDecision;
  diagnostics: {
    executionTimeMs: number;
    provider: "jev_openrouter" | "jev_typesafe" | "deterministic_fallback";
    model?: string;
    candidateCount: number;
    fareUnavailable: boolean;
    realtimeUnavailable: boolean;
  };
}
