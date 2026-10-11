// src/db/pool.js
import "server-only";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema/index.js";

/**
 * Interactive-transaction client. Create one per request, then close it.
 *   const { db, close } = getTxDb();
 *   try { await db.transaction(...) } finally { await close(); }
 */
export function getTxDb() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return { db: drizzle(pool, { schema }), close: () => pool.end() };
}