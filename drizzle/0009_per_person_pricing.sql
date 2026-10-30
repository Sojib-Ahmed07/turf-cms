DROP INDEX "bookings_active_slot_uq";--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "pricing" text DEFAULT 'slot' NOT NULL;--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "people" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_active_slot_uq" ON "bookings" USING btree ("pitch_id","booking_date","start_time") WHERE "bookings"."status" in ('held', 'confirmed') and "bookings"."people" is null;