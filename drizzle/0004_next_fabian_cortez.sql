ALTER TABLE "payments" ADD COLUMN "gateway" text DEFAULT 'sslcommerz' NOT NULL;--> statement-breakpoint
CREATE INDEX "payments_session_key_idx" ON "payments" USING btree ("session_key");