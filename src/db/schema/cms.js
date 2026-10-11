// src/db/schema/cms.js
import {
    pgTable,
    integer,
    text,
    boolean,
    timestamp,
    jsonb,
    uuid,
    index,
} from "drizzle-orm/pg-core";
import { coupons } from "./commerce.js";

export const siteSettings = pgTable("site_settings", {
    id: integer("id").primaryKey().default(1),
    siteName: text("site_name").notNull().default("TurfZone"),
    tagline: text("tagline"),
    logoLightPublicId: text("logo_light_public_id"),
    logoLightUrl: text("logo_light_url"),
    logoDarkPublicId: text("logo_dark_public_id"),
    logoDarkUrl: text("logo_dark_url"),
    faviconPublicId: text("favicon_public_id"),
    faviconUrl: text("favicon_url"),
    brandColor: text("brand_color").notNull().default("#18a058"),
    menuButtonLabel: text("menu_button_label").notNull().default("Book a slot"),
    showMyBookings: boolean("show_my_bookings").notNull().default(true),
    contact: jsonb("contact").notNull().default({}),
    socials: jsonb("socials").notNull().default([]),
    seo: jsonb("seo").notNull().default({}),
    slider: jsonb("slider").notNull().default({ autoplayMs: 6000, pauseOnHover: true }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by"),
});

export const navItems = pgTable("nav_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
});

export const heroSlides = pgTable(
    "hero_slides",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        imagePublicId: text("image_public_id"),
        imageUrl: text("image_url"),
        mobileImagePublicId: text("mobile_image_public_id"),
        mobileImageUrl: text("mobile_image_url"),
        alt: text("alt"),
        eyebrow: text("eyebrow"),
        heading: text("heading").notNull(),
        subheading: text("subheading"),
        ctaLabel: text("cta_label"),
        ctaHref: text("cta_href"),
        overlay: text("overlay").notNull().default("dark"),
        sortOrder: integer("sort_order").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        startsAt: timestamp("starts_at"),
        endsAt: timestamp("ends_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("hero_active_idx").on(t.isActive, t.sortOrder)]
);

export const PLACEMENTS = ["top_bar", "home_after_hero", "home_mid", "booking_page", "popup"];

export const promoBanners = pgTable(
    "promo_banners",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        placement: text("placement").notNull(),
        imagePublicId: text("image_public_id"),
        imageUrl: text("image_url"),
        badge: text("badge"),
        title: text("title").notNull(),
        body: text("body"),
        ctaLabel: text("cta_label"),
        ctaHref: text("cta_href"),
        couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
        sortOrder: integer("sort_order").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        startsAt: timestamp("starts_at"),
        endsAt: timestamp("ends_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("promo_place_idx").on(t.placement, t.isActive, t.sortOrder)]
);

export const SECTION_KEYS = ["live_grounds", "how_it_works", "visit"];

export const pageSections = pgTable("page_sections", {
    key: text("key").primaryKey(),
    isVisible: boolean("is_visible").notNull().default(true),
    data: jsonb("data").notNull().default({}),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const media = pgTable(
    "media",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        publicId: text("public_id").notNull().unique(),
        url: text("url").notNull(),
        width: integer("width"),
        height: integer("height"),
        bytes: integer("bytes"),
        format: text("format"),
        originalName: text("original_name"),
        alt: text("alt"),
        folder: text("folder"),
        uploadedBy: text("uploaded_by"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("media_folder_idx").on(t.folder, t.createdAt)]
);