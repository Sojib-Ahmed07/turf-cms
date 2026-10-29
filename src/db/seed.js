// src/db/seed.js
// Sample content, in Bangla (the whole site is Bangla only).
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema/index.js";

const { siteSettings, navItems, pageSections, pitches, user, heroSlides, promoBanners, coupons } = schema;
const db = drizzle(neon(process.env.DATABASE_URL), { schema });

const img = (id, w = 1800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

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
            tagline: "মিরপুর ১২-তে ফ্লাডলাইটের আলোয় ফুটবল",
            brandColor: "#18a058",
            menuButtonLabel: "স্লট বুক করুন",
            showMyBookings: true,
            contact: {
                phone: "+880 1700 000000",
                whatsapp: "+880 1700 000000",
                email: "hello@turfzone.bd",
                address: "মিরপুর ১২, ঢাকা ১২১৬",
                hours: "প্রতিদিন, সকাল ৬টা থেকে রাত ৩টা",
                mapUrl: "https://maps.google.com/?q=Mirpur+12+Dhaka",
            },
            socials: [
                { platform: "facebook", url: "https://facebook.com" },
                { platform: "instagram", url: "https://instagram.com" },
            ],
            seo: {
                title: "টার্ফজোন — মিরপুর ১২-তে ফ্লাডলাইট মাঠ বুক করুন",
                description:
                    "মাঠ সিলেক্ট করুন, সময় সিলেক্ট করুন, অনলাইনে পেমেন্ট করুন। মিরপুর ১২, ঢাকায় তিনটি মাঠ, খোলা সকাল ৬টা থেকে রাত ৩টা।",
            },
            slider: { autoplayMs: 6000, pauseOnHover: true },
        })
        .onConflictDoNothing();

    // Nav items
    const navCount = await db.select({ c: sql`count(*)` }).from(navItems);
    if (Number(navCount[0].c) === 0) {
        await db.insert(navItems).values([
            { label: "হোম", href: "/", sortOrder: 0, isVisible: true },
            { label: "স্লট বুক করুন", href: "/book", sortOrder: 1, isVisible: true },
            { label: "মাঠ", href: "/grounds", sortOrder: 2, isVisible: true },
        ]);
    }

    // Page sections
    const sections = [
        {
            key: "live_grounds",
            data: {
                heading: "আজ খালি মাঠ",
                body: "তিনটি মাঠ, সবগুলোতে ফ্লাডলাইট। প্রতিটি স্লট আলাদা করে বুক করা যায়।",
            },
        },
        {
            key: "how_it_works",
            data: {
                heading: "তিন ধাপে বুকিং",
                steps: [
                    { title: "মাঠ সিলেক্ট করুন", body: "কোন মাঠে, কত জনের খেলা খেলবেন সিলেক্ট করুন।" },
                    { title: "সময় সিলেক্ট করুন", body: "কোন সময় খালি, সরাসরি দেখুন। বুক হয়ে যাওয়া স্লট ধূসর থাকে।" },
                    { title: "অনলাইনে পেমেন্ট করুন", body: "কার্ড, বিকাশ, নগদ বা রকেট দিয়ে পেমেন্ট করুন।" },
                ],
            },
        },
        {
            key: "visit",
            data: {
                heading: "আমাদের ঠিকানা",
                body: "মিরপুর ১২ গোলচত্বর থেকে মাত্র পাঁচ মিনিট। ভেতরেই গাড়ি রাখার জায়গা আছে।",
                facilities: ["চেঞ্জিং রুম", "ফ্লাডলাইট", "খাবার পানি", "ফ্রি পার্কিং"],
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
                name: "পিচ এ",
                slug: "pitch-a",
                description: "নতুন ৪০ মিমি টার্ফের আমাদের প্রধান মাঠ, ৫ জন করে খেলার জন্য।",
                sport: "football",
                format: "৫ জন করে",
                size: "৪০ × ২০ মিটার",
                surface: "ইনডোর, ৪০ মিমি টার্ফ",
                hourlyRate: "1600",
                openHour: 6,
                closeHour: 3,
                defaultSlotMinutes: 90,
                defaultBlocks: DEFAULT_BLOCKS_A,
                sortOrder: 0,
                isActive: true,
            },
            {
                name: "পিচ বি",
                slug: "pitch-b",
                description: "বড় মাঠ, ৭ জন করে খেলার জন্য। ছুটির দিনের লিগের জন্য সেরা।",
                sport: "football",
                format: "৭ জন করে",
                size: "৫০ × ৩০ মিটার",
                surface: "আউটডোর, ৫০ মিমি টার্ফ",
                hourlyRate: "2000",
                openHour: 6,
                closeHour: 3,
                defaultSlotMinutes: 90,
                defaultBlocks: DEFAULT_BLOCKS_A,
                sortOrder: 1,
                isActive: true,
            },
            {
                name: "বক্স ক্রিকেট",
                slug: "box-cricket",
                description: "নেট দিয়ে ঘেরা বক্স ক্রিকেট, ৬ জন করে খেলার জন্য।",
                sport: "cricket",
                format: "৬ জন করে",
                size: "৩০ × ১৫ মিটার",
                surface: "ইনডোর ম্যাট",
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

    // Hero slides (sample content; the admin replaces these in Admin > Hero slides)
    const slideCount = await db.select({ c: sql`count(*)` }).from(heroSlides);
    if (Number(slideCount[0].c) === 0) {
        await db.insert(heroSlides).values([
            {
                imageUrl: img("1487466365202-1afdb86c764e"),
                alt: "রাতে ফ্লাডলাইটের আলোয় ফুটবল মাঠ",
                eyebrow: "রাত ৩টা পর্যন্ত খোলা",
                heading: "আলো জ্বললেই শুরু আপনার খেলা",
                subheading: "মিরপুর ১২-তে ফ্লাডলাইটের টার্ফ। স্লট সিলেক্ট করুন, অনলাইনে পেমেন্ট করুন, সোজা মাঠে নেমে পড়ুন।",
                ctaLabel: "স্লট বুক করুন",
                ctaHref: "/book",
                sortOrder: 0,
            },
            {
                imageUrl: img("1517747614396-d21a78b850e8"),
                alt: "ওপর থেকে দেখা আলো জ্বলা ফুটবল মাঠ",
                eyebrow: "৭ জন করে",
                heading: "পিচ বি-তে দৌড়ানোর জায়গা বেশি",
                subheading: "ছুটির দিনের লিগের জন্য বড় মাঠ, এলইডি ফ্লাডলাইটসহ।",
                ctaLabel: "সন্ধ্যার স্লট দেখুন",
                ctaHref: "/book?part=evening",
                sortOrder: 1,
            },
            {
                imageUrl: img("1570498839593-e565b39455fc"),
                alt: "সবুজ টার্ফে রাখা ফুটবল",
                eyebrow: "সকালের স্লট",
                heading: "গরমের আগে সকাল ৬টায় খেলা শুরু",
                subheading: "সারা দিনের মধ্যে সকালের স্লটের দাম সবচেয়ে কম।",
                ctaLabel: "সকালের স্লট দেখুন",
                ctaHref: "/book?part=morning",
                sortOrder: 2,
            },
        ]);
    }

    // Coupons + offer banners (sample content; Admin > Coupons and Offer banners later)
    const bannerCount = await db.select({ c: sql`count(*)` }).from(promoBanners);
    if (Number(bannerCount[0].c) === 0) {
        await db
            .insert(coupons)
            .values([
                { code: "NIGHT20", type: "percent", value: "20", maxDiscount: "600" },
                { code: "FIRST200", type: "fixed", value: "200", perUserLimit: 1 },
            ])
            .onConflictDoNothing();
        const codes = await db.select({ id: coupons.id, code: coupons.code }).from(coupons);
        const couponId = (code) => codes.find((c) => c.code === code)?.id ?? null;

        await db.insert(promoBanners).values([
            {
                placement: "top_bar",
                title: "ছুটির দিনের রাতে ২০% ছাড়",
                ctaLabel: "এখনই বুক করুন",
                ctaHref: "/book?part=late",
                couponId: couponId("NIGHT20"),
            },
            {
                placement: "home_after_hero",
                imageUrl: img("1601701089287-2a4fa78d091b", 1200),
                badge: "২০% ছাড়",
                title: "শুক্র ও শনিবার রাত ৯টার পর",
                body: "দল নিয়ে রাতে খেলতে আসুন, প্রতিটি স্লটে টাকা বাঁচান। পেমেন্টের সময় নিচের কোডটি দিন।",
                ctaLabel: "রাতের স্লট বুক করুন",
                ctaHref: "/book?part=late",
                couponId: couponId("NIGHT20"),
            },
            {
                placement: "home_mid",
                badge: "টুর্নামেন্ট",
                title: "আসছে মিরপুর ফাইভ-এ-সাইড কাপ",
                body: "১৬টি দল, এক সপ্তাহান্তে খেলা। দলের নাম দিতে কাউন্টারে ফোন করুন।",
                ctaLabel: "কাউন্টারে ফোন করুন",
                ctaHref: "/#visit",
            },
            {
                placement: "booking_page",
                badge: "২০% ছাড়",
                title: "শুক্র ও শনিবার রাত ৯টার পর",
                couponId: couponId("NIGHT20"),
            },
            {
                placement: "popup",
                imageUrl: img("1459865264687-595d652de67e", 900),
                badge: "প্রথম বুকিং",
                title: "প্রথম খেলায় ৳২০০ ছাড়",
                body: "অ্যাকাউন্ট খুলুন আর পেমেন্টের সময় কোডটি দিন। প্রতিজন একবারই ব্যবহার করতে পারবেন।",
                ctaLabel: "প্রথম স্লট বুক করুন",
                ctaHref: "/book",
                couponId: couponId("FIRST200"),
                isActive: false, // switch on in Admin > Offer banners when coupons work at checkout
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