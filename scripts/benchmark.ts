import { RouterService } from "../src/services/router";
import { RouteRequest } from "../src/types/journey";
import { TransitServiceMetrics } from "../src/services/transitService";

const directRequest: RouteRequest = {
  origin: { latitude: 8.9983386, longitude: 38.7860596 }, // Bole Medhanialem
  destination: { latitude: 9.0365871, longitude: 38.7522029 }, // Piassa Arada
};

const transferRequest: RouteRequest = {
  origin: { latitude: 8.9983386, longitude: 38.7860596 }, // Bole Medhanialem
  destination: { latitude: 9.0212283, longitude: 38.8717948 }, // Ayat Chefe
  preferences: { maxTransfers: 1 },
};

interface BenchResult {
  concurrency: number;
  totalTimeMs: number;
  avgTimeMs: number;
  p50TimeMs: number;
  p95TimeMs: number;
  errorRatePercent: number;
  totalQueriesExecuted: number;
  avgQueriesPerRequest: number;
}

async function runBenchmarkForRequest(
  name: string,
  request: RouteRequest,
  concurrencyLevels: number[]
): Promise<BenchResult[]> {
  console.log(`\n=== Starting Benchmark: ${name} ===`);
  const results: BenchResult[] = [];

  for (const concurrency of concurrencyLevels) {
    TransitServiceMetrics.reset();
    const timings: number[] = [];
    let errors = 0;

    const startTotal = performance.now();

    const tasks = Array.from({ length: concurrency }).map(async () => {
      const t0 = performance.now();
      try {
        const res = await RouterService.findJourneysWithDiagnostics(request);
        if (res.journeys.length === 0 && name.includes("Direct")) {
          errors++;
        }
      } catch (err) {
        errors++;
      } finally {
        timings.push(performance.now() - t0);
      }
    });

    await Promise.all(tasks);

    const totalTimeMs = Math.round(performance.now() - startTotal);
    timings.sort((a, b) => a - b);

    const avgTimeMs = Math.round(timings.reduce((sum, t) => sum + t, 0) / timings.length);
    const p50TimeMs = Math.round(timings[Math.floor(timings.length * 0.5)] || 0);
    const p95TimeMs = Math.round(timings[Math.floor(timings.length * 0.95)] || timings[timings.length - 1]);
    const errorRatePercent = (errors / concurrency) * 100;
    const totalQueries = TransitServiceMetrics.sqlQueries;
    const avgQueries = Math.round((totalQueries / concurrency) * 10) / 10;

    const benchRes: BenchResult = {
      concurrency,
      totalTimeMs,
      avgTimeMs,
      p50TimeMs,
      p95TimeMs,
      errorRatePercent,
      totalQueriesExecuted: totalQueries,
      avgQueriesPerRequest: avgQueries,
    };

    results.push(benchRes);

    console.log(
      `[${name}] Concurrency ${concurrency.toString().padStart(2, " ")} | Total: ${totalTimeMs}ms | p50: ${p50TimeMs}ms | p95: ${p95TimeMs}ms | Total SQL: ${totalQueries} (avg ${avgQueries}/req) | Errors: ${errorRatePercent}%`
    );
  }

  return results;
}

async function main() {
  const levels = [1, 5, 10, 20];

  // Warmup
  await RouterService.findJourneys(directRequest);

  const directResults = await runBenchmarkForRequest("Bole -> Piassa (Direct)", directRequest, levels);
  const transferResults = await runBenchmarkForRequest("Bole -> Ayat Chefe (Transfer)", transferRequest, levels);

  console.log("\n=======================================================");
  console.log("             FINAL BENCHMARK SUMMARY REPORT            ");
  console.log("=======================================================");

  console.log("\nDirect Route (Bole -> Piassa):");
  console.table(directResults);

  console.log("\nTransfer Route (Bole -> Ayat Chefe):");
  console.table(transferResults);
}

main().catch(console.error);
