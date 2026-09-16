import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "[DATABASE_CONFIGURATION_ERROR] DATABASE_URL environment variable is required but missing."
  );
}

// Preserve single connection pool across Next.js dev server reloads
const globalForDb = globalThis as unknown as {
  postgresClient?: postgres.Sql;
};

export const client =
  globalForDb.postgresClient ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });
