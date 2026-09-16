CREATE TYPE "admin_role" AS ENUM('SUPER_ADMIN', 'DATA_ADMIN', 'MODERATOR', 'ANALYST');--> statement-breakpoint
CREATE TYPE "fare_source_type" AS ENUM('official', 'estimated', 'user_reported', 'unknown');--> statement-breakpoint
CREATE TYPE "journey_state" AS ENUM('PLANNING', 'ROUTE_SELECTED', 'PREPARING', 'WALKING_TO_STOP', 'AT_STOP', 'WAITING_FOR_TRANSPORT', 'BOARDING', 'ONBOARD', 'APPROACHING_STOP', 'TRANSFER', 'WALKING_TO_DESTINATION', 'ARRIVED', 'CANCELLED', 'ERROR');--> statement-breakpoint
CREATE TYPE "report_type" AS ENUM('wrong_route', 'wrong_stop', 'wrong_fare', 'route_unavailable', 'stop_moved', 'transport_issue', 'other');--> statement-breakpoint
CREATE TYPE "transport_mode" AS ENUM('minibus', 'city_bus', 'public_bus', 'lrt', 'taxi', 'ride_hailing', 'walking', 'bicycle', 'multimodal');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" serial PRIMARY KEY,
	"admin_user_id" integer NOT NULL,
	"action" varchar(255) NOT NULL,
	"target_type" varchar(255),
	"target_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"role" "admin_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY,
	"user_id" integer,
	"event_type" varchar(255) NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"country" varchar(100) DEFAULT 'Ethiopia' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fare_observations" (
	"id" serial PRIMARY KEY,
	"route_id" integer NOT NULL,
	"amount_etb" integer NOT NULL,
	"source_type" "fare_source_type" NOT NULL,
	"source" varchar(255) NOT NULL,
	"effective_date" timestamp NOT NULL,
	"last_verified_at" timestamp,
	"confidence" varchar(50) DEFAULT 'medium' NOT NULL,
	"transport_mode" "transport_mode" NOT NULL,
	"metadata" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "journey_segments" (
	"id" serial PRIMARY KEY,
	"journey_id" integer NOT NULL,
	"transport_mode" "transport_mode" NOT NULL,
	"from_stop_id" integer,
	"to_stop_id" integer,
	"instructions" text,
	"duration_minutes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" serial PRIMARY KEY,
	"trip_id" integer NOT NULL,
	"route_id" integer,
	"state" "journey_state" DEFAULT 'PLANNING'::"journey_state" NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"id" serial PRIMARY KEY,
	"city_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(100) DEFAULT 'system' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_sources" (
	"id" serial PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"type" varchar(100) DEFAULT 'official' NOT NULL,
	"last_verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" serial PRIMARY KEY,
	"route_id" integer NOT NULL,
	"stop_id" integer NOT NULL,
	"sequence" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" serial PRIMARY KEY,
	"operator_id" integer NOT NULL,
	"mode" "transport_mode" NOT NULL,
	"name" varchar(255) NOT NULL,
	"origin_stop_id" integer NOT NULL,
	"destination_stop_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"data_source" varchar(100) DEFAULT 'official' NOT NULL,
	"last_verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "saved_places" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"label" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_alerts" (
	"id" serial PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"route_id" integer,
	"stop_id" integer,
	"severity" varchar(50) DEFAULT 'info' NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"id" serial PRIMARY KEY,
	"city_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"amharic_name" varchar(255),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "transport_operators" (
	"id" serial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"city_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"origin" varchar(255) NOT NULL,
	"destination" varchar(255) NOT NULL,
	"budget_etb" integer,
	"preference" varchar(50) DEFAULT 'balanced' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"walking_tolerance_minutes" integer DEFAULT 10,
	"preferred_transport" varchar(50),
	"avoid_modes" text DEFAULT '',
	"fastest_vs_cheapest" varchar(50) DEFAULT 'balanced'
);
--> statement-breakpoint
CREATE TABLE "user_reports" (
	"id" serial PRIMARY KEY,
	"user_id" integer,
	"type" "report_type" NOT NULL,
	"description" text NOT NULL,
	"location" varchar(255),
	"route_id" integer,
	"stop_id" integer,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"email" varchar(255) NOT NULL UNIQUE,
	"name" varchar(255),
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_interactions" (
	"id" serial PRIMARY KEY,
	"session_id" integer NOT NULL,
	"intent" varchar(255),
	"confidence" double precision DEFAULT 0,
	"response_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_sessions" (
	"id" serial PRIMARY KEY,
	"user_id" integer,
	"locale" varchar(25) DEFAULT 'en-US' NOT NULL,
	"transcript" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
