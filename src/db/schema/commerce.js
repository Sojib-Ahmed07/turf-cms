// src/db/schema/commerce.js
import { sql } from "drizzle-orm";
import {
    pgTable,
    text,
    integer,
    boolean,
    timestamp,
    decimal,
    uuid,
    jsonb,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { pitches, timeBlocks } from "./booking.js";

export const coupons = pgTable("coupons", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    type: text("type").notNull(), // percent | fixed
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
    minAmount: decimal("min_amount", { precision: 10, scale: 2 }),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    perUserLimit: integer("per_user_limit").default(1),
    pitchIds: jsonb("pitch_ids"),
    timeWindow: jsonb("time_window"),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookings = pgTable(
    "bookings",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        code: text("code").notNull().unique(),
        userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
        customerName: text("customer_name"),
        customerPhone: text("customer_phone"),
        pitchId: uuid("pitch_id")
            .notNull()
            .references(() => pitches.id, { onDelete: "cascade" }),
        timeBlockId: uuid("time_block_id").references(() => timeBlocks.id, { onDelete: "set null" }),
        bookingDate: text("booking_date").notNull(),
        startTime: text("start_time").notNull(),
        endTime: text("end_time").notNull(),
        subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
        discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
        totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
        couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
        status: text("status").notNull().default("held"), // held | confirmed | cancelled | expired | completed
        paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | paid | refund_due | refunded
        source: text("source").notNull().default("online"), // online | walk_in
        holdExpiresAt: timestamp("hold_expires_at"),
        cancelledAt: timestamp("cancelled_at"),
        cancelReason: text("cancel_reason"),
        // Step 7b: gate check-in state, set by /verify/<token> ("Mark as used").
        checkedInAt: timestamp("checked_in_at"),
        checkedInBy: text("checked_in_by").references(() => user.id, { onDelete: "set null" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        // One active booking per pitch + date + start time. Cancelled/expired rows don't block the slot.
        uniqueIndex("bookings_active_slot_uq")
            .on(t.pitchId, t.bookingDate, t.startTime)
            .where(sql`${t.status} in ('held', 'confirmed')`),
        index("bookings_pitch_date_idx").on(t.pitchId, t.bookingDate),
        index("bookings_user_idx").on(t.userId),
        index("bookings_hold_expiry_idx").on(t.status, t.holdExpiresAt),
    ]
);

export const couponRedemptions = pgTable(
    "coupon_redemptions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        couponId: uuid("coupon_id")
            .notNull()
            .references(() => coupons.id, { onDelete: "cascade" }),
        userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
        bookingId: uuid("booking_id")
            .notNull()
            .references(() => bookings.id, { onDelete: "cascade" }),
        amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("redemptions_coupon_user_idx").on(t.couponId, t.userId)]
);

export const payments = pgTable(
    "payments",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        bookingId: uuid("booking_id")
            .notNull()
            .references(() => bookings.id, { onDelete: "cascade" }),
        tranId: text("tran_id").notNull().unique(),
        sessionKey: text("session_key"),
        valId: text("val_id"),
        bankTranId: text("bank_tran_id"),
        cardType: text("card_type"),
        amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
        currency: text("currency").notNull().default("BDT"),
        status: text("status").notNull().default("initiated"),
        riskLevel: text("risk_level"),
        riskTitle: text("risk_title"),
        refundRefId: text("refund_ref_id"),
        raw: jsonb("raw"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        index("payments_booking_idx").on(t.bookingId),
        index("payments_status_idx").on(t.status),
    ]
);

export const auditLog = pgTable(
    "audit_log",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        actorId: text("actor_id"),
        action: text("action").notNull(),
        entity: text("entity"),
        entityId: text("entity_id"),
        meta: jsonb("meta"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("audit_created_idx").on(t.createdAt)]
);