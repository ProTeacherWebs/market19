import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../../db/schema";

export { schema };

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || null;
}

export function createDataDb(databaseUrl = getDatabaseUrl()) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(neon(databaseUrl), { schema });
}

export type DataDb = ReturnType<typeof createDataDb>;
