ALTER TABLE "site_settings" ADD COLUMN "map_lat" double precision;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "map_lng" double precision;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "map_zoom" integer;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "map_label" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "map_address" text;