// src/db/schema/booking.js
import {
    pgTable,
    text,
    boolean,
    timestamp,
    decimal,
    integer,
    uuid,
    jsonb,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

export const SPORTS = ["football", "cricket", "badminton", "swimming_pool"];

export const pitches = pgTable("pitches", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    sport: text("sport").notNull().default("football"),
    format: text("format"),
    size: text("size"),
    surface: text("surface"),
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
    openHour: integer("open_hour").notNull().default(6),
    closeHour: integer("close_hour").notNull().default(3),
    defaultSlotMinutes: integer("default_slot_minutes").notNull().default(90),
    defaultBlocks: jsonb("default_blocks").notNull().default([]),
    imagePublicId: text("image_public_id"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const timeBlocks = pgTable(
    "time_blocks",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        pitchId: uuid("pitch_id")
            .notNull()
            .references(() => pitches.id, { onDelete: "cascade" }),
        date: text("date").notNull(),
        startTime: text("start_time").notNull(),
        endTime: text("end_time").notNull(),
        price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
        sortOrder: integer("sort_order").notNull(),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("time_blocks_pitch_date_idx").on(t.pitchId, t.date, t.sortOrder),
        uniqueIndex("time_blocks_pitch_date_order_idx").on(t.pitchId, t.date, t.sortOrder),
    ]
);