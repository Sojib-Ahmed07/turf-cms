// src/db/pool.js
import "server-only";
import { sql } from "drizzle-orm";
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

/**
 * Run fn(tx) inside one transaction that first takes Postgres advisory locks on `keys`
 * (e.g. "pitch:<id>", "user:<id>"). Two requests with a shared key run one after the other, so
 * "check, then insert" (slot overlap, hold limits, coupon limits) can't be raced.
 * The locks are released when the transaction ends. A throw inside fn rolls everything back.
 */
export async function withLockedTx(keys, fn) {
    const { db, close } = getTxDb();
    try {
        return await db.transaction(async (tx) => {
            for (const key of [...new Set(keys)].sort()) {
                await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
            }
            return fn(tx);
        });
    } finally {
        await close();
    }
}