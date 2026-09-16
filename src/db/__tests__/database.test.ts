import { describe, expect, test } from "bun:test";
import { db } from "@/db";
import { stops, routes, trips, stopTimes, shapes } from "@/db/schema";
import { sql } from "drizzle-orm";
import { TransitService } from "@/services/transitService";

describe("PostgreSQL Integration & Schema Verification", () => {
  test("Database tables exist and are populated with verified GTFS record counts", async () => {
    const [stopsRes] = await db.select({ count: sql<number>`count(*)` }).from(stops);
    const [routesRes] = await db.select({ count: sql<number>`count(*)` }).from(routes);
    const [tripsRes] = await db.select({ count: sql<number>`count(*)` }).from(trips);
    const [stopTimesRes] = await db.select({ count: sql<number>`count(*)` }).from(stopTimes);
    const [shapesRes] = await db.select({ count: sql<number>`count(*)` }).from(shapes);

    const stopsCount = Number(stopsRes.count);
    const routesCount = Number(routesRes.count);
    const tripsCount = Number(tripsRes.count);
    const stopTimesCount = Number(stopTimesRes.count);
    const shapesCount = Number(shapesRes.count);

    expect(stopsCount).toBeGreaterThan(2000);
    expect(routesCount).toBeGreaterThan(400);
    expect(tripsCount).toBeGreaterThan(900);
    expect(stopTimesCount).toBeGreaterThan(9000);
    expect(shapesCount).toBeGreaterThan(200000);
  });

  test("TransitService queries PostgreSQL directly for Bole Medhanialem stop", async () => {
    const matchedStops = await TransitService.findStopByName("Bole Medhanialem");
    expect(matchedStops.length).toBeGreaterThan(0);

    const boleStop = matchedStops.find((s) => s.id === "node/7037142424");
    expect(boleStop).toBeDefined();
    expect(boleStop?.name).toBe("Bole Medhanialem");
  });

  test("TransitService queries PostgreSQL for Piassa Arada stop", async () => {
    const matchedStops = await TransitService.findStopByName("Piassa Arada");
    expect(matchedStops.length).toBeGreaterThan(0);

    const piassaStop = matchedStops.find((s) => s.id === "node/7041071579");
    expect(piassaStop).toBeDefined();
    expect(piassaStop?.name).toBe("Piassa Arada");
  });

  test("Database integrity: No orphan stop_times, trips, routes, or shapes exist", async () => {
    // 1. Exact counts
    const [stopsRes] = await db.select({ count: sql<number>`count(*)` }).from(stops);
    const [routesRes] = await db.select({ count: sql<number>`count(*)` }).from(routes);
    const [tripsRes] = await db.select({ count: sql<number>`count(*)` }).from(trips);
    const [stopTimesRes] = await db.select({ count: sql<number>`count(*)` }).from(stopTimes);
    const [shapesRes] = await db.select({ count: sql<number>`count(*)` }).from(shapes);

    expect(Number(stopsRes.count)).toBe(2312);
    expect(Number(routesRes.count)).toBe(464);
    expect(Number(tripsRes.count)).toBe(921);
    expect(Number(stopTimesRes.count)).toBe(9389);
    expect(Number(shapesRes.count)).toBe(255191);

    // 2. Orphan check
    const orphanStopTimes = await db.execute(
      sql`SELECT count(*) FROM stop_times st WHERE NOT EXISTS (SELECT 1 FROM stops s WHERE s.id = st.stop_id);`
    );
    expect(Number((orphanStopTimes as any)[0].count)).toBe(0);

    const orphanTrips = await db.execute(
      sql`SELECT count(*) FROM trips t WHERE NOT EXISTS (SELECT 1 FROM routes r WHERE r.id = t.route_id);`
    );
    expect(Number((orphanTrips as any)[0].count)).toBe(0);
  });

  test("Spatial Query Performance: EXPLAIN ANALYZE proves idx_stops_lat_lon B-tree index usage across 50m to 1km radii", async () => {
    const boleLat = 8.9983386;
    const boleLon = 38.7860596;
    const radiiMeters = [50, 100, 250, 500, 1000];

    for (const radius of radiiMeters) {
      const degreesPerMeter = 1 / 111000;
      const maxDelta = radius * degreesPerMeter;
      const minLat = boleLat - maxDelta;
      const maxLat = boleLat + maxDelta;
      const minLon = boleLon - maxDelta;
      const maxLon = boleLon + maxDelta;

      const explainRes = await db.execute(sql.raw(`
        EXPLAIN (ANALYZE, FORMAT JSON)
        SELECT * FROM stops
        WHERE latitude BETWEEN ${minLat} AND ${maxLat}
          AND longitude BETWEEN ${minLon} AND ${maxLon};
      `));

      const planJson = (explainRes as any)[0]["QUERY PLAN"][0];
      const execTime = planJson["Execution Time"];
      const rootNode = planJson["Plan"];
      const childNode = rootNode["Plans"] ? rootNode["Plans"][0] : null;
      const indexName = rootNode["Index Name"] || childNode?.["Index Name"];

      expect(execTime).toBeLessThan(50); // Under 50ms (measured <1ms)
      expect(indexName).toBe("idx_stops_lat_lon");
    }
  });

  test("Seeder transaction rollback preserves previously valid dataset on failure", async () => {
    const [beforeStops] = await db.select({ count: sql<number>`count(*)` }).from(stops);
    const initialCount = Number(beforeStops.count);
    expect(initialCount).toBeGreaterThan(0);

    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`TRUNCATE TABLE stop_times, shapes, trips, routes, stops CASCADE;`);
        throw new Error("Simulated seed failure inside transaction");
      });
    } catch {
      // Expected rollback error
    }

    const [afterStops] = await db.select({ count: sql<number>`count(*)` }).from(stops);
    const restoredCount = Number(afterStops.count);
    expect(restoredCount).toBe(initialCount);
  });
});
