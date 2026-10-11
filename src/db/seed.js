// src/db/seed.js
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema/index.js";

const { siteSettings, navItems, pageSections, pitches, user } = schema;
const db = drizzle(neon(process.env.DATABASE_URL), { schema });

const DEFAULT_BLOCKS_A = [
    { startTime: "06:00", endTime: "07:30", price: "1500", sortOrder: 0 },
    { startTime: "07:30", endTime: "09:00", price: "1500", sortOrder: 1 },
    { startTime: "09:00", endTime: "10:30", price: "1400", sortOrder: 2 },
    { startTime: "16:00", endTime: "17:30", price: "1800", sortOrder: 3 },
    { startTime: "17:30", endTime: "19:00", price: "2000", sortOrder: 4 },
    { startTime: "19:00", endTime: "20:30", price: "2200", sortOrder: 5 },
    { startTime: "20:30", endTime: "22:00", price: "2200", sortOrder: 6 },
    { startTime: "22:00", endTime: "23:30", price: "1800", sortOrder: 7 },
];

async function main() {
    console.log("Seeding…");

    // Site settings (single row, id = 1)
    await db
        .insert(siteSettings)
        .values({
            id: 1,
            siteName: "TurfZone",
            tagline: "Floodlit football in Mirpur 12",
            brandColor: "#18a058",
            menuButtonLabel: "Book a slot",
            showMyBookings: true,
            contact: {
                phone: "+880 1700 000000",
                email: "hello@turfzone.bd",
                address: "Mirpur 12, Dhaka 1216",
                hours: "6:00 am to 3:00 am, every day",
                mapUrl: "https://maps.google.com/?q=Mirpur+12+Dhaka",
            },
            socials: [
                { platform: "facebook", url: "https://facebook.com" },
                { platform: "instagram", url: "https://instagram.com" },
            ],
            seo: {
                title: "TurfZone — Book a floodlit ground in Mirpur 12",
                description:
                    "Pick a ground, choose your time, pay online. Three grounds open 6 am to 3 am in Mirpur 12, Dhaka.",
            },
            slider: { autoplayMs: 6000, pauseOnHover: true },
        })
        .onConflictDoNothing();

    // Nav items
    const navCount = await db.select({ c: sql`count(*)` }).from(navItems);
    if (Number(navCount[0].c) === 0) {
        await db.insert(navItems).values([
            { label: "Home", href: "/", sortOrder: 0, isVisible: true },
            { label: "Book a slot", href: "/book", sortOrder: 1, isVisible: true },
            { label: "Grounds", href: "/#grounds", sortOrder: 2, isVisible: true },
            { label: "Offers", href: "/#offers", sortOrder: 3, isVisible: true },
            { label: "Contact", href: "/#visit", sortOrder: 4, isVisible: true },
        ]);
    }

    // Page sections
    const sections = [
        {
            key: "live_grounds",
            data: {
                heading: "Grounds open today",
                body: "Three grounds, all floodlit, all bookable by the block.",
            },
        },
        {
            key: "how_it_works",
            data: {
                heading: "Book in three taps",
                steps: [
                    { title: "Pick a ground", body: "Choose the surface and the format you want to play." },
                    { title: "Choose your time", body: "Live availability. Booked slots are greyed out." },
                    { title: "Pay online", body: "Card, bKash, Nagad or Rocket through SSLCommerz." },
                ],
            },
        },
        {
            key: "visit",
            data: {
                heading: "Find us",
                body: "We are five minutes from Mirpur 12 roundabout, with parking on site.",
                facilities: ["Changing rooms", "Floodlights", "Drinking water", "Free parking"],
            },
        },
    ];
    for (const s of sections) {
        await db.insert(pageSections).values(s).onConflictDoNothing();
    }

    // Sample pitches
    const pitchCount = await db.select({ c: sql`count(*)` }).from(pitches);
    if (Number(pitchCount[0].c) === 0) {
        await db.insert(pitches).values([
            {
                name: "Pitch A",
                slug: "pitch-a",
                description: "Our main 5-a-side ground with a fresh 40 mm turf.",
                sport: "football",
                format: "5-a-side",
                size: "40 × 20 m",
                surface: "Indoor, 40 mm turf",
                hourlyRate: "1600",
                openHour: 6,
                closeHour: 3,
                defaultSlotMinutes: 90,
                defaultBlocks: DEFAULT_BLOCKS_A,
                sortOrder: 0,
                isActive: true,
            },
            {
                name: "Pitch B",
                slug: "pitch-b",
                description: "Wider 7-a-side ground, best for weekend leagues.",
                sport: "football",
                format: "7-a-side",
                size: "50 × 30 m",
                surface: "Outdoor, 50 mm turf",
                hourlyRate: "2000",
                openHour: 6,
                closeHour: 3,
                defaultSlotMinutes: 90,
                defaultBlocks: DEFAULT_BLOCKS_A,
                sortOrder: 1,
                isActive: true,
            },
            {
                name: "Box Cricket",
                slug: "box-cricket",
                description: "Net-enclosed box cricket for six-a-side games.",
                sport: "cricket",
                format: "6-a-side",
                size: "30 × 15 m",
                surface: "Indoor matting",
                hourlyRate: "1800",
                openHour: 6,
                closeHour: 3,
                defaultSlotMinutes: 90,
                defaultBlocks: DEFAULT_BLOCKS_A,
                sortOrder: 2,
                isActive: true,
            },
        ]);
    }

    // Promote first admin
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    if (adminEmail) {
        const updated = await db
            .update(user)
            .set({ role: "admin" })
            .where(eq(user.email, adminEmail))
            .returning({ id: user.id });
        if (updated.length) {
            console.log(`Promoted ${adminEmail} to admin.`);
        } else {
            console.log(`No user with email ${adminEmail} yet. Register first, then re-run seed.`);
        }
    }

    console.log("Seed complete.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});