ALTER TABLE "bookings" ADD COLUMN "checked_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "checked_in_by" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checked_in_by_user_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;