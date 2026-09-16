import fs from "fs";
import path from "path";
import { db, client } from "./index";
import { stops, routes, trips, stopTimes, shapes } from "./schema";
import { sql } from "drizzle-orm";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseGtfsFile<T>(filePath: string, mapper: (row: Record<string, string>) => T | null): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[DATABASE_SEED_ERROR] Required GTFS file missing at path: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const records: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    const mapped = mapper(row);
    if (mapped) {
      records.push(mapped);
    }
  }

  return records;
}

export async function importGtfsData(gtfsDir = path.join(process.cwd(), "data", "gtfs")) {
  console.log(`[GTFS Import] Starting transactional GTFS import from ${gtfsDir}...`);

  // 1. STOPS
  const parsedStops = parseGtfsFile(path.join(gtfsDir, "stops.txt"), (row) => {
    if (!row.stop_id || !row.stop_name) return null;
    return {
      id: row.stop_id,
      name: row.stop_name,
      nameAmharic: row.stop_name.match(/[\u1200-\u137F]/) ? row.stop_name : null,
      latitude: parseFloat(row.stop_lat) || 0,
      longitude: parseFloat(row.stop_lon) || 0,
      parentStation: row.parent_station || null,
      locationType: parseInt(row.location_type || "0", 10),
    };
  });
  console.log(`[GTFS Import] Parsed ${parsedStops.length} stops from CSV.`);

  // 2. ROUTES
  const parsedRoutes = parseGtfsFile(path.join(gtfsDir, "routes.txt"), (row) => {
    if (!row.route_id) return null;
    return {
      id: row.route_id,
      agencyId: row.agency_id || null,
      shortName: row.route_short_name || null,
      longName: row.route_long_name || null,
      routeType: parseInt(row.route_type || "3", 10),
      colorHex: row.route_color ? `#${row.route_color}` : "#1779c2",
      description: row.route_desc || null,
    };
  });
  console.log(`[GTFS Import] Parsed ${parsedRoutes.length} routes from CSV.`);

  // 3. TRIPS
  const parsedTrips = parseGtfsFile(path.join(gtfsDir, "trips.txt"), (row) => {
    if (!row.trip_id || !row.route_id) return null;
    return {
      id: row.trip_id,
      routeId: row.route_id,
      serviceId: row.service_id || null,
      shapeId: row.shape_id || null,
    };
  });
  console.log(`[GTFS Import] Parsed ${parsedTrips.length} trips from CSV.`);

  // 4. STOP TIMES
  const parsedStopTimes = parseGtfsFile(path.join(gtfsDir, "stop_times.txt"), (row) => {
    if (!row.trip_id || !row.stop_id) return null;
    return {
      tripId: row.trip_id,
      stopId: row.stop_id,
      arrivalTime: row.arrival_time || null,
      departureTime: row.departure_time || null,
      stopSequence: parseInt(row.stop_sequence || "0", 10),
    };
  });
  console.log(`[GTFS Import] Parsed ${parsedStopTimes.length} stop times from CSV.`);

  // 5. SHAPES
  const parsedShapes = parseGtfsFile(path.join(gtfsDir, "shapes.txt"), (row) => {
    if (!row.shape_id || !row.shape_pt_lat) return null;
    return {
      shapeId: row.shape_id,
      latitude: parseFloat(row.shape_pt_lat) || 0,
      longitude: parseFloat(row.shape_pt_lon) || 0,
      shapeSequence: parseInt(row.shape_pt_sequence || "0", 10),
    };
  });
  console.log(`[GTFS Import] Parsed ${parsedShapes.length} shape points from CSV.`);

  // Perform Transactional PostgreSQL Import
  try {
    const actualCounts = await db.transaction(async (tx) => {
      console.log("[GTFS Import] Truncating existing PostgreSQL transit tables in transaction...");
      await tx.execute(sql`TRUNCATE TABLE stop_times, shapes, trips, routes, stops CASCADE;`);

      if (parsedStops.length > 0) {
        for (let i = 0; i < parsedStops.length; i += 1000) {
          await tx.insert(stops).values(parsedStops.slice(i, i + 1000));
        }
      }
      if (parsedRoutes.length > 0) {
        for (let i = 0; i < parsedRoutes.length; i += 1000) {
          await tx.insert(routes).values(parsedRoutes.slice(i, i + 1000));
        }
      }
      if (parsedTrips.length > 0) {
        for (let i = 0; i < parsedTrips.length; i += 1000) {
          await tx.insert(trips).values(parsedTrips.slice(i, i + 1000));
        }
      }
      if (parsedStopTimes.length > 0) {
        for (let i = 0; i < parsedStopTimes.length; i += 1000) {
          await tx.insert(stopTimes).values(parsedStopTimes.slice(i, i + 1000));
        }
      }
      if (parsedShapes.length > 0) {
        for (let i = 0; i < parsedShapes.length; i += 1000) {
          await tx.insert(shapes).values(parsedShapes.slice(i, i + 1000));
        }
      }

      // Verify Counts directly inside transaction
      const [stopsRes] = await tx.select({ count: sql<number>`count(*)` }).from(stops);
      const [routesRes] = await tx.select({ count: sql<number>`count(*)` }).from(routes);
      const [tripsRes] = await tx.select({ count: sql<number>`count(*)` }).from(trips);
      const [stopTimesRes] = await tx.select({ count: sql<number>`count(*)` }).from(stopTimes);
      const [shapesRes] = await tx.select({ count: sql<number>`count(*)` }).from(shapes);

      return {
        stopsCount: Number(stopsRes.count),
        routesCount: Number(routesRes.count),
        tripsCount: Number(tripsRes.count),
        stopTimesCount: Number(stopTimesRes.count),
        shapesCount: Number(shapesRes.count),
      };
    });

    console.log("[GTFS Import] PostgreSQL Transactional Seeding Completed & Verified!");
    console.log(`              Stops:      ${actualCounts.stopsCount}`);
    console.log(`              Routes:     ${actualCounts.routesCount}`);
    console.log(`              Trips:      ${actualCounts.tripsCount}`);
    console.log(`              Stop Times: ${actualCounts.stopTimesCount}`);
    console.log(`              Shapes:     ${actualCounts.shapesCount}`);

    return actualCounts;
  } catch (err: any) {
    console.error("[DATABASE_SEED_ERROR] PostgreSQL transaction failed and was rolled back:", err);
    throw new Error(`[DATABASE_SEED_ERROR] PostgreSQL seed insertion failed: ${err?.message}`);
  }
}

// Run CLI directly if executed
if (process.argv[1]?.includes("seed")) {
  importGtfsData()
    .then(async () => {
      await client.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await client.end();
      process.exit(1);
    });
}
