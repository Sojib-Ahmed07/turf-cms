// src/lib/env.js
import "server-only";
import { z } from "zod";

const schema = z.object({
    DATABASE_URL: z.string().url(),
    APP_URL: z.string().url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    SEED_ADMIN_EMAIL: z.string().email().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. See src/lib/env.js.");
}

export const env = parsed.data;