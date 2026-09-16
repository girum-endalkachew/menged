import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const transportModeEnum = pgEnum("transport_mode", [
  "minibus",
  "city_bus",
  "public_bus",
  "lrt",
  "taxi",
  "ride_hailing",
  "walking",
  "bicycle",
  "multimodal",
]);

export const journeyStateEnum = pgEnum("journey_state", [
  "PLANNING",
  "ROUTE_SELECTED",
  "PREPARING",
  "WALKING_TO_STOP",
  "AT_STOP",
  "WAITING_FOR_TRANSPORT",
  "BOARDING",
  "ONBOARD",
  "APPROACHING_STOP",
  "TRANSFER",
  "WALKING_TO_DESTINATION",
  "ARRIVED",
  "CANCELLED",
  "ERROR",
]);

export const fareSourceTypeEnum = pgEnum("fare_source_type", [
  "official",
  "estimated",
  "user_reported",
  "unknown",
]);

export const reportTypeEnum = pgEnum("report_type", [
  "wrong_route",
  "wrong_stop",
  "wrong_fare",
  "route_unavailable",
  "stop_moved",
  "transport_issue",
  "other",
]);

export const adminRoleEnum = pgEnum("admin_role", [
  "SUPER_ADMIN",
  "DATA_ADMIN",
  "MODERATOR",
  "ANALYST",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }).notNull().default("Ethiopia"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const neighborhoods = pgTable("neighborhoods", {
  id: serial("id").primaryKey(),
  cityId: integer("city_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
});

export const stops = pgTable("stops", {
  id: serial("id").primaryKey(),
  cityId: integer("city_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  amharicName: varchar("amharic_name", { length: 255 }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata").default({}),
});

export const transportOperators = pgTable("transport_operators", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  cityId: integer("city_id").notNull(),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  operatorId: integer("operator_id").notNull(),
  mode: transportModeEnum("mode").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  originStopId: integer("origin_stop_id").notNull(),
  destinationStopId: integer("destination_stop_id").notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  dataSource: varchar("data_source", { length: 100 }).default("official").notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),
});

export const routeStops = pgTable("route_stops", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  stopId: integer("stop_id").notNull(),
  sequence: integer("sequence").notNull(),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  origin: varchar("origin", { length: 255 }).notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  budgetEtb: integer("budget_etb"),
  preference: varchar("preference", { length: 50 }).default("balanced").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journeys = pgTable("journeys", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  routeId: integer("route_id"),
  state: journeyStateEnum("state").notNull().default("PLANNING"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journeySegments = pgTable("journey_segments", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").notNull(),
  transportMode: transportModeEnum("transport_mode").notNull(),
  fromStopId: integer("from_stop_id"),
  toStopId: integer("to_stop_id"),
  instructions: text("instructions"),
  durationMinutes: integer("duration_minutes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  walkingToleranceMinutes: integer("walking_tolerance_minutes").default(10),
  preferredTransport: varchar("preferred_transport", { length: 50 }),
  avoidModes: text("avoid_modes").default(""),
  fastestVsCheapest: varchar("fastest_vs_cheapest", { length: 50 }).default("balanced"),
});

export const savedPlaces = pgTable("saved_places", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  label: varchar("label", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fareObservations = pgTable("fare_observations", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  amountEtb: integer("amount_etb").notNull(),
  sourceType: fareSourceTypeEnum("source_type").notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),
  confidence: varchar("confidence", { length: 50 }).default("medium").notNull(),
  transportMode: transportModeEnum("transport_mode").notNull(),
  metadata: jsonb("metadata").default({}),
});

export const userReports = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  type: reportTypeEnum("type").notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 255 }),
  routeId: integer("route_id"),
  stopId: integer("stop_id"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: varchar("status", { length: 50 }).default("new").notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 100 }).default("system").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voiceSessions = pgTable("voice_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  locale: varchar("locale", { length: 25 }).default("en-US").notNull(),
  transcript: text("transcript"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voiceInteractions = pgTable("voice_interactions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  intent: varchar("intent", { length: 255 }),
  confidence: doublePrecision("confidence").default(0),
  responseText: text("response_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const researchSources = pgTable("research_sources", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  url: text("url").notNull(),
  type: varchar("type", { length: 100 }).default("official").notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: adminRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  targetType: varchar("target_type", { length: 255 }),
  targetId: integer("target_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  eventType: varchar("event_type", { length: 255 }).notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceAlerts = pgTable("service_alerts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  routeId: integer("route_id"),
  stopId: integer("stop_id"),
  severity: varchar("severity", { length: 50 }).default("info").notNull(),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
