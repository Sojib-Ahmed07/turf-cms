// src/db/index.js
import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema/index.js";

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });