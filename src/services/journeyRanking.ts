import { Journey } from "@/types/journey";
import {
  JourneyRankingPreference,
  JourneyRankingResult,
  JourneyRankingDiagnostics,
} from "@/types/journeyRanking";
import { JourneyMetricsService } from "./journeyMetrics";

export class JourneyRankingService {
  /**
   * Deterministic balanced utility cost:
   * Lower cost = more desirable journey.
   *
   * Formulated from transit engineering principles:
   * 1. Travel Time: 1.0 point per minute
   * 2. Walking: 0.05 points per meter (~3.75 points per 75m / 1 min walking)
   * 3. Transfer Disutility: 12.0 points per transfer (waiting, boarding penalty)
   * 4. Backtracking Sanity:
   *    - Tolerance threshold: <= 150m (normal street/roundabout curvature) => 0 penalty
   *    - Excess detour: (totalBacktrackingMeters - 150) * 0.02 (2 points per 100m detour)
   */
  public static calculateBalancedCost(journey: Journey): number {
    const m = journey.metrics || JourneyMetricsService.calculateMetrics(journey);
    const durationPoints = journey.estimatedDurationMinutes * 1.0;
    const walkingPoints = m.totalWalkingMeters * 0.05;
    const transferPoints = journey.transfersCount * 12.0;

    const excessBacktrackMeters = Math.max(0, m.totalBacktrackingMeters - 150);
    const backtrackPoints = excessBacktrackMeters * 0.02;

    return durationPoints + walkingPoints + transferPoints + backtrackPoints;
  }

  /**
   * Orders already-valid Journey candidates deterministically according to the requested preference.
   * Does NOT filter or invent journeys. Candidate set is strictly preserved.
   */
  public static rankJourneys(
    journeys: Journey[],
    preference: JourneyRankingPreference = "balanced"
  ): Journey[] {
    const res = this.rankWithDiagnostics(journeys, preference);
    return res.journeys;
  }

  /**
   * Orders candidates with full timing and diagnostics metadata.
   */
  public static rankWithDiagnostics(
    journeys: Journey[],
    preference: JourneyRankingPreference = "balanced"
  ): JourneyRankingResult {
    const totalStartTime = performance.now();

    // 1. Calculate and cache metrics for all journeys
    const metricStartTime = performance.now();
    for (let i = 0; i < journeys.length; i++) {
      if (!journeys[i].metrics) {
        journeys[i].metrics = JourneyMetricsService.calculateMetrics(journeys[i]);
      }
    }
    const metricCalculationTimeMs = performance.now() - metricStartTime;

    const rankingStartTime = performance.now();
    const sorted = [...journeys];
    let fareUnavailable = false;

    switch (preference) {
      case "fastest": {
        sorted.sort((a, b) => {
          // 1. Duration (ascending)
          if (a.estimatedDurationMinutes !== b.estimatedDurationMinutes) {
            return a.estimatedDurationMinutes - b.estimatedDurationMinutes;
          }
          const ma = a.metrics!;
          const mb = b.metrics!;
          // 2. Walking distance tie-breaker (ascending)
          if (ma.totalWalkingMeters !== mb.totalWalkingMeters) {
            return ma.totalWalkingMeters - mb.totalWalkingMeters;
          }
          // 3. Transfers count tie-breaker (ascending)
          if (a.transfersCount !== b.transfersCount) {
            return a.transfersCount - b.transfersCount;
          }
          // 4. Backtracking sanity tie-breaker (ascending)
          if (ma.totalBacktrackingMeters !== mb.totalBacktrackingMeters) {
            return ma.totalBacktrackingMeters - mb.totalBacktrackingMeters;
          }
          // 5. Stable deterministic ID
          return a.id.localeCompare(b.id);
        });

        for (let i = 0; i < sorted.length; i++) {
          sorted[i] = { ...sorted[i], tag: i === 0 ? "Fastest" : "Balanced" };
        }
        break;
      }

      case "least_walking": {
        sorted.sort((a, b) => {
          const ma = a.metrics!;
          const mb = b.metrics!;
          // 1. Walking distance (ascending)
          if (ma.totalWalkingMeters !== mb.totalWalkingMeters) {
            return ma.totalWalkingMeters - mb.totalWalkingMeters;
          }
          // 2. Duration tie-breaker (ascending)
          if (a.estimatedDurationMinutes !== b.estimatedDurationMinutes) {
            return a.estimatedDurationMinutes - b.estimatedDurationMinutes;
          }
          // 3. Transfers count tie-breaker (ascending)
          if (a.transfersCount !== b.transfersCount) {
            return a.transfersCount - b.transfersCount;
          }
          // 4. Backtracking sanity tie-breaker (ascending)
          if (ma.totalBacktrackingMeters !== mb.totalBacktrackingMeters) {
            return ma.totalBacktrackingMeters - mb.totalBacktrackingMeters;
          }
          // 5. Stable deterministic ID
          return a.id.localeCompare(b.id);
        });

        for (let i = 0; i < sorted.length; i++) {
          sorted[i] = { ...sorted[i], tag: i === 0 ? "Least Walking" : "Balanced" };
        }
        break;
      }

      case "fewest_transfers": {
        sorted.sort((a, b) => {
          // 1. Transfers count (ascending)
          if (a.transfersCount !== b.transfersCount) {
            return a.transfersCount - b.transfersCount;
          }
          // 2. Duration tie-breaker (ascending)
          if (a.estimatedDurationMinutes !== b.estimatedDurationMinutes) {
            return a.estimatedDurationMinutes - b.estimatedDurationMinutes;
          }
          const ma = a.metrics!;
          const mb = b.metrics!;
          // 3. Walking distance tie-breaker (ascending)
          if (ma.totalWalkingMeters !== mb.totalWalkingMeters) {
            return ma.totalWalkingMeters - mb.totalWalkingMeters;
          }
          // 4. Backtracking sanity tie-breaker (ascending)
          if (ma.totalBacktrackingMeters !== mb.totalBacktrackingMeters) {
            return ma.totalBacktrackingMeters - mb.totalBacktrackingMeters;
          }
          // 5. Stable deterministic ID
          return a.id.localeCompare(b.id);
        });

        for (let i = 0; i < sorted.length; i++) {
          sorted[i] = { ...sorted[i], tag: "Balanced" };
        }
        break;
      }

      case "cheapest": {
        // GTFS dataset lacks fare data: fare = UNAVAILABLE
        // We refuse to fabricate fares or rank by fake costs.
        fareUnavailable = true;

        // Fallback to balanced ordering without claiming "Cheapest"
        sorted.sort((a, b) => {
          const costA = this.calculateBalancedCost(a);
          const costB = this.calculateBalancedCost(b);
          if (Math.abs(costA - costB) >= 1e-4) {
            return costA - costB;
          }
          if (a.estimatedDurationMinutes !== b.estimatedDurationMinutes) {
            return a.estimatedDurationMinutes - b.estimatedDurationMinutes;
          }
          const ma = a.metrics!;
          const mb = b.metrics!;
          if (ma.totalWalkingMeters !== mb.totalWalkingMeters) {
            return ma.totalWalkingMeters - mb.totalWalkingMeters;
          }
          if (a.transfersCount !== b.transfersCount) {
            return a.transfersCount - b.transfersCount;
          }
          return a.id.localeCompare(b.id);
        });

        // Ensure NO journey receives a false "Cheapest" tag
        for (let i = 0; i < sorted.length; i++) {
          sorted[i] = { ...sorted[i], tag: "Balanced" };
        }
        break;
      }

      case "balanced":
      default: {
        sorted.sort((a, b) => {
          const costA = this.calculateBalancedCost(a);
          const costB = this.calculateBalancedCost(b);
          if (Math.abs(costA - costB) >= 1e-4) {
            return costA - costB;
          }
          // Lexicographic tie-breakers
          if (a.estimatedDurationMinutes !== b.estimatedDurationMinutes) {
            return a.estimatedDurationMinutes - b.estimatedDurationMinutes;
          }
          const ma = a.metrics!;
          const mb = b.metrics!;
          if (ma.totalWalkingMeters !== mb.totalWalkingMeters) {
            return ma.totalWalkingMeters - mb.totalWalkingMeters;
          }
          if (a.transfersCount !== b.transfersCount) {
            return a.transfersCount - b.transfersCount;
          }
          if (ma.totalBacktrackingMeters !== mb.totalBacktrackingMeters) {
            return ma.totalBacktrackingMeters - mb.totalBacktrackingMeters;
          }
          return a.id.localeCompare(b.id);
        });

        for (let i = 0; i < sorted.length; i++) {
          sorted[i] = { ...sorted[i], tag: "Balanced" };
        }
        break;
      }
    }

    const rankingTimeMs = performance.now() - rankingStartTime;
    const totalRankingOverheadMs = performance.now() - totalStartTime;

    const diagnostics: JourneyRankingDiagnostics = {
      preference,
      candidateCount: sorted.length,
      metricCalculationTimeMs,
      rankingTimeMs,
      totalRankingOverheadMs,
      fareUnavailable,
      message: fareUnavailable
        ? "Fare data is unavailable in GTFS dataset. Preserved balanced ordering without fabricating fare costs."
        : undefined,
    };

    return {
      journeys: sorted,
      diagnostics,
    };
  }
}
