import { pgTable, varchar, text, integer, doublePrecision, serial, index } from "drizzle-orm/pg-core";

// 1. STOPS TABLE
export const stops = pgTable("stops", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAmharic: varchar("name_amharic", { length: 255 }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  parentStation: varchar("parent_station", { length: 128 }),
  locationType: integer("location_type").default(0),
}, (table) => [
  index("idx_stops_lat_lon").on(table.latitude, table.longitude),
]);

// 2. ROUTES TABLE
export const routes = pgTable("routes", {
  id: varchar("id", { length: 128 }).primaryKey(),
  agencyId: varchar("agency_id", { length: 64 }),
  shortName: varchar("short_name", { length: 64 }),
  longName: text("long_name"),
  routeType: integer("route_type").notNull(), // Preserves raw GTFS route_type (3 = Bus/Minibus, 0 = LRT)
  colorHex: varchar("color_hex", { length: 10 }),
  description: text("description"),
});

// 3. TRIPS TABLE
export const trips = pgTable("trips", {
  id: varchar("id", { length: 128 }).primaryKey(),
  routeId: varchar("route_id", { length: 128 }).references(() => routes.id).notNull(),
  serviceId: varchar("service_id", { length: 64 }),
  shapeId: varchar("shape_id", { length: 128 }),
}, (table) => [
  index("idx_trips_route_id").on(table.routeId),
  index("idx_trips_shape_id").on(table.shapeId),
]);

// 4. STOP TIMES TABLE
export const stopTimes = pgTable("stop_times", {
  id: serial("id").primaryKey(),
  tripId: varchar("trip_id", { length: 128 }).references(() => trips.id).notNull(),
  stopId: varchar("stop_id", { length: 128 }).references(() => stops.id).notNull(),
  arrivalTime: varchar("arrival_time", { length: 32 }),
  departureTime: varchar("departure_time", { length: 32 }),
  stopSequence: integer("stop_sequence").notNull(),
}, (table) => [
  index("idx_stop_times_trip_id").on(table.tripId),
  index("idx_stop_times_stop_id").on(table.stopId),
  index("idx_stop_times_sequence").on(table.stopSequence),
]);

// 5. SHAPES TABLE
export const shapes = pgTable("shapes", {
  id: serial("id").primaryKey(),
  shapeId: varchar("shape_id", { length: 128 }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  shapeSequence: integer("shape_sequence").notNull(),
}, (table) => [
  index("idx_shapes_shape_id").on(table.shapeId),
]);
