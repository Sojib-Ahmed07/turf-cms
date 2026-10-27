-- drizzle/0007_roles_and_nav_cleanup.sql
-- Data only (no schema change).
-- 1. The editor and staff roles were removed: anyone who had them becomes a player (admins are untouched).
UPDATE "user" SET "role" = 'user', "updated_at" = now() WHERE "role" NOT IN ('admin', 'user');--> statement-breakpoint
-- 2. Menu: Grounds now has its own page; the Offers link (an anchor that often led nowhere) is removed.
UPDATE "nav_items" SET "href" = '/grounds' WHERE "href" = '/#grounds';--> statement-breakpoint
DELETE FROM "nav_items" WHERE "href" = '/#offers';