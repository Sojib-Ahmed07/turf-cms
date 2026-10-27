-- drizzle/0006_outstanding_preak.sql
-- One redemption per booking (redeemCoupon uses ON CONFLICT on this index; without it every coupon booking errors).
-- IF NOT EXISTS: some databases already got this index from an earlier local migration or db:push.
-- If this fails with "could not create unique index", remove the duplicate coupon_redemptions rows for that booking_id first.
CREATE UNIQUE INDEX IF NOT EXISTS "redemptions_booking_uq" ON "coupon_redemptions" USING btree ("booking_id");