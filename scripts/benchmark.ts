import { RouterService } from "../src/services/router";
import { RoutingDatasetLoader } from "../src/services/routingDatasetLoader";
import { RouteRequest } from "../src/types/journey";
import { SqlTracker } from "../src/db/sqlTracker";

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
  cacheState: "Warm" | "Cold";
  totalTimeMs: number;
  avgTimeMs: number;
  p50TimeMs: number;
  p95TimeMs: number;
  p99TimeMs: number;
  avgDbTimeMs: number;
  avgCpuTimeMs: number;
  errorRatePercent: number;
  totalSqlStatements: number;
  avgSqlStatementsPerReq: number;
}

async function runBenchmark(
  name: string,
  request: RouteRequest,
  concurrencyLevels: number[],
  cacheState: "Warm" | "Cold"
): Promise<BenchResult[]> {
  console.log(`\n=== Running Benchmark: ${name} (${cacheState} Cache) ===`);
  const results: BenchResult[] = [];

  for (const concurrency of concurrencyLevels) {
    if (cacheState === "Cold") {
      RoutingDatasetLoader.clearGlobalGraph();
    } else {
      await RoutingDatasetLoader.initGlobalGraph();
    }

    const timings: number[] = [];
    const dbTimes: number[] = [];
    const cpuTimes: number[] = [];
    let errors = 0;

    const trackerResult = await SqlTracker.run(async () => {
      const startTotal = performance.now();

      const tasks = Array.from({ length: concurrency }).map(async () => {
        const t0 = performance.now();
        try {
          const res = await RouterService.findJourneysWithDiagnostics(request);
          dbTimes.push(res.diagnostics.dbTimeMs);
          cpuTimes.push(res.diagnostics.routerCpuTimeMs);
          if (res.journeys.length === 0 && name.includes("Direct")) {
            errors++;
          }
        } catch {
          errors++;
        } finally {
          timings.push(performance.now() - t0);
        }
      });

      await Promise.all(tasks);
      return performance.now() - startTotal;
    });

    const totalTimeMs = Math.round(trackerResult.result);
    timings.sort((a, b) => a - b);

    const avgTimeMs = Math.round(timings.reduce((sum, t) => sum + t, 0) / timings.length);
    const p50TimeMs = Math.round(timings[Math.floor(timings.length * 0.5)] || 0);
    const p95TimeMs = Math.round(timings[Math.floor(timings.length * 0.95)] || timings[timings.length - 1]);
    const p99TimeMs = Math.round(timings[Math.floor(timings.length * 0.99)] || timings[timings.length - 1]);
    const avgDbTimeMs = Math.round((dbTimes.reduce((s, t) => s + t, 0) / dbTimes.length) * 10) / 10;
    const avgCpuTimeMs = Math.round((cpuTimes.reduce((s, t) => s + t, 0) / cpuTimes.length) * 10) / 10;
    const errorRatePercent = (errors / concurrency) * 100;
    const totalSql = trackerResult.queryCount;
    const avgSql = Math.round((totalSql / concurrency) * 10) / 10;

    const benchRes: BenchResult = {
      concurrency,
      cacheState,
      totalTimeMs,
      avgTimeMs,
      p50TimeMs,
      p95TimeMs,
      p99TimeMs,
      avgDbTimeMs,
      avgCpuTimeMs,
      errorRatePercent,
      totalSqlStatements: totalSql,
      avgSqlStatementsPerReq: avgSql,
    };

    results.push(benchRes);

    console.log(
      `[${name} | ${cacheState}] C=${concurrency.toString().padStart(2, " ")} | Total: ${totalTimeMs}ms | p50: ${p50TimeMs}ms | p95: ${p95TimeMs}ms | DB Time: ${avgDbTimeMs}ms | CPU: ${avgCpuTimeMs}ms | SQL/Req: ${avgSql} | Errors: ${errorRatePercent}%`
    );
  }

  return results;
}

async function main() {
  console.log("\n=======================================================");
  console.log("       STEP 6: ROUTINGGRAPH MEMORY MEASUREMENT         ");
  console.log("=======================================================");
  const memoryStats = await RoutingDatasetLoader.measureGraphMemoryFootprint();
  console.log(`Heap Before Construction: ${memoryStats.heapBeforeMB} MB`);
  console.log(`Heap After Construction : ${memoryStats.heapAfterMB} MB`);
  console.log(`Measured Graph Cost     : ${memoryStats.graphCostMB} MB`);

  const levels = [1, 5, 10, 20, 50];

  // Warmup
  await RoutingDatasetLoader.initGlobalGraph();
  await RouterService.findJourneys(directRequest);

  console.log("\n=======================================================");
  console.log("     BENCHMARK PHASE 1: WARM GRAPH CACHE BENCHMARK    ");
  console.log("=======================================================");
  const warmDirect = await runBenchmark("Direct (Bole -> Piassa)", directRequest, levels, "Warm");
  const warmTransfer = await runBenchmark("Transfer (Bole -> Ayat Chefe)", transferRequest, levels, "Warm");

  console.log("\n=======================================================");
  console.log("     BENCHMARK PHASE 2: COLD GRAPH CACHE BENCHMARK    ");
  console.log("=======================================================");
  const coldDirect = await runBenchmark("Direct (Bole -> Piassa)", directRequest, levels, "Cold");

  console.log("\n=======================================================");
  console.log("             FINAL BENCHMARK SUMMARY REPORT            ");
  console.log("=======================================================");

  console.log("\n1. Direct Route Warm Cache (Bole -> Piassa):");
  console.table(warmDirect);

  console.log("\n2. Transfer Route Warm Cache (Bole -> Ayat Chefe):");
  console.table(warmTransfer);

  console.log("\n3. Direct Route Cold Cache (Bole -> Piassa):");
  console.table(coldDirect);
}

main().catch(console.error);
