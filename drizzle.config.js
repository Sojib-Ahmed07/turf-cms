// drizzle.config.js
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Same env file as Next.js and the seed script. Falls back to .env if .env.local is missing.
config({ path: ".env.local" });
config();

export default defineConfig({
    schema: "./src/db/schema/index.js",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: { url: process.env.DATABASE_URL },
    strict: true,
    verbose: true,
});