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
