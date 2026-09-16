CREATE TABLE "routes" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"agency_id" varchar(64),
	"short_name" varchar(64),
	"long_name" text,
	"route_type" integer NOT NULL,
	"color_hex" varchar(10),
	"description" text
);
--> statement-breakpoint
CREATE TABLE "shapes" (
	"id" serial PRIMARY KEY NOT NULL,
	"shape_id" varchar(128) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"shape_sequence" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stop_times" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" varchar(128) NOT NULL,
	"stop_id" varchar(128) NOT NULL,
	"arrival_time" varchar(32),
	"departure_time" varchar(32),
	"stop_sequence" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_amharic" varchar(255),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"parent_station" varchar(128),
	"location_type" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"route_id" varchar(128) NOT NULL,
	"service_id" varchar(64),
	"shape_id" varchar(128)
);
--> statement-breakpoint
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_shapes_shape_id" ON "shapes" USING btree ("shape_id");--> statement-breakpoint
CREATE INDEX "idx_stop_times_trip_id" ON "stop_times" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "idx_stop_times_stop_id" ON "stop_times" USING btree ("stop_id");--> statement-breakpoint
CREATE INDEX "idx_stop_times_sequence" ON "stop_times" USING btree ("stop_sequence");--> statement-breakpoint
CREATE INDEX "idx_trips_route_id" ON "trips" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "idx_trips_shape_id" ON "trips" USING btree ("shape_id");