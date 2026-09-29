import { Journey } from './journey';
import { JourneyMetrics } from './journeyMetrics';

export type JourneyRankingPreference =
  | "fastest"
  | "least_walking"
  | "fewest_transfers"
  | "balanced"
  | "cheapest";

export interface JourneyRankingDiagnostics {
  preference: JourneyRankingPreference;
  candidateCount: number;
  metricCalculationTimeMs: number;
  rankingTimeMs: number;
  totalRankingOverheadMs: number;
  fareUnavailable: boolean;
  message?: string;
}

export interface JourneyRankingResult {
  journeys: Journey[];
  diagnostics: JourneyRankingDiagnostics;
}
