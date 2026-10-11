// src/lib/sample-data.js
// Static sample content for the UI phase. Every export here maps to a
// table in the blueprint; later it gets replaced by cached DB queries.

const u = (id, w = 1800) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/* ---------------- site_settings ---------------- */
export const siteSettings = {
    siteName: "TurfZone",
    tagline: "Floodlit turf in Mirpur, open till 3 am",
    logoLightUrl: null, // null -> wordmark fallback
    logoDarkUrl: null,
    contact: {
        phone: "+880 1711-000000",
        email: "hello@turfzone.com.bd",
        address: "Plot 14, Road 7, Section 12, Mirpur, Dhaka 1216",
        mapUrl: "https://maps.google.com",
        hours: "Every day, 6 am to 3 am",
    },
    socials: [
        { platform: "facebook", url: "https://facebook.com" },
        { platform: "instagram", url: "https://instagram.com" },
        { platform: "youtube", url: "https://youtube.com" },
    ],
};

/* ---------------- nav_items ---------------- */
export const navItems = [
    { label: "Home", href: "/" },
    { label: "Book a slot", href: "/book" },
    { label: "Grounds", href: "/#grounds" },
    { label: "Offers", href: "/#offers" },
    { label: "Contact", href: "/#visit" },
];

/* ---------------- hero_slides ---------------- */
export const heroSlides = [
    {
        id: "s1",
        imageUrl: u("1487466365202-1afdb86c764e"),
        alt: "Floodlit football turf at night",
        eyebrow: "Open till 3 am",
        heading: "Your game starts when the lights come on",
        subheading:
            "Two FIFA-grade turfs in Mirpur. Pick a slot, pay with bKash or card, and walk straight onto the pitch.",
        ctaLabel: "Book a slot",
        ctaHref: "/book",
        overlay: "dark",
    },
    {
        id: "s2",
        imageUrl: u("1517747614396-d21a78b850e8"),
        alt: "Aerial view of a lit football field",
        eyebrow: "New: 7-a-side pitch",
        heading: "More room to run on Pitch B",
        subheading: "60 × 40 m, fresh 50 mm turf, LED floodlights and a covered dugout.",
        ctaLabel: "See Pitch B",
        ctaHref: "/book?pitch=b",
        overlay: "dark",
    },
    {
        id: "s3",
        imageUrl: u("1570498839593-e565b39455fc"),
        alt: "Football resting on green turf",
        eyebrow: "Morning slots",
        heading: "Beat the heat with a 6 am kickoff",
        subheading: "Early slots are 30% cheaper every weekday before 10 am.",
        ctaLabel: "View morning slots",
        ctaHref: "/book?time=morning",
        overlay: "dark",
    },
];

/* ---------------- promo_banners ---------------- */
export const promoBanners = {
    top_bar: {
        id: "p0",
        title: "Weekend nights are 20% off",
        badge: "NIGHT20",
        ctaLabel: "Book now",
        ctaHref: "/book",
    },
    home_after_hero: {
        id: "p1",
        imageUrl: u("1601701089287-2a4fa78d091b", 1200),
        badge: "20% off",
        title: "Friday and Saturday after 9 pm",
        body: "Bring the squad for late games and save on every slot. Applied at checkout with the code below.",
        code: "NIGHT20",
        ctaLabel: "Book a night slot",
        ctaHref: "/book",
        endsAt: "Ends 31 Oct",
    },
    home_mid: {
        id: "p2",
        badge: "Tournament",
        title: "Mirpur 5-a-side Cup, 14–16 November",
        body: "16 teams, ৳50,000 prize pool. Registration closes 5 November.",
        ctaLabel: "Register your team",
        ctaHref: "/tournament",
    },
    booking_page: {
        id: "p3",
        badge: "30% off",
        title: "Weekday mornings before 10 am",
        code: "EARLY30",
    },
    popup: {
        id: "p4",
        imageUrl: u("1459865264687-595d652de67e", 900),
        badge: "First booking",
        title: "৳200 off your first game",
        body: "Create an account and use the code at checkout. One use per player.",
        code: "FIRST200",
        ctaLabel: "Book my first slot",
        ctaHref: "/book",
    },
};

/* ---------------- page_sections ---------------- */
export const sections = {
    how_it_works: {
        heading: "From your phone to the pitch in three steps",
        steps: [
            { title: "Pick a slot", body: "Choose the ground, the date and a free time block. Prices are shown up front." },
            { title: "Pay securely", body: "bKash, Nagad, Rocket or card through SSLCommerz. Your slot is held for 15 minutes." },
            { title: "Show up and play", body: "Your booking ticket lands in My bookings. Show it at the gate." },
        ],
    },
    live_grounds: {
        heading: "Grounds open today",
        body: "Live availability for tonight. Tap a time to jump straight into booking.",
    },
    visit: {
        heading: "Find us in Mirpur 12",
        body: "Five minutes from Mirpur 10 metro. Free parking for 20 cars and 60 bikes.",
        facilities: ["Floodlights", "Changing rooms", "Showers", "Drinking water", "Parking", "Prayer space"],
    },
};

/* ---------------- pitches + today's slots ---------------- */
export const pitches = [
    {
        id: "a",
        name: "Pitch A",
        format: "5-a-side",
        size: "40 × 20 m",
        surface: "Indoor, 40 mm turf",
        hourlyRate: 1600,
        imageUrl: u("1704633785114-52104ce3d626", 1200),
        freeTonight: ["19:30", "21:00", "00:00", "01:30"],
    },
    {
        id: "b",
        name: "Pitch B",
        format: "7-a-side",
        size: "60 × 40 m",
        surface: "Outdoor, 50 mm turf",
        hourlyRate: 2400,
        imageUrl: u("1522947961977-67fe74257c16", 1200),
        freeTonight: ["22:30", "00:00"],
    },
    {
        id: "c",
        name: "Box Cricket",
        format: "6-a-side cricket",
        size: "30 × 18 m",
        surface: "Netted cage",
        hourlyRate: 1400,
        imageUrl: u("1459865264687-595d652de67e", 1200),
        freeTonight: ["18:00", "19:30", "21:00"],
    },
];

/* Time blocks for the selected pitch/date on /book.
   state: free | booked | held | past */
export const slotBlocks = [
    { id: "b1", start: "06:00", end: "07:30", price: 1680, state: "past" },
    { id: "b2", start: "07:30", end: "09:00", price: 1680, state: "past" },
    { id: "b3", start: "09:00", end: "10:30", price: 1680, state: "booked" },
    { id: "b4", start: "10:30", end: "12:00", price: 2400, state: "free" },
    { id: "b5", start: "12:00", end: "13:30", price: 2400, state: "free" },
    { id: "b6", start: "13:30", end: "15:00", price: 2400, state: "free" },
    { id: "b7", start: "15:00", end: "16:30", price: 2400, state: "booked" },
    { id: "b8", start: "16:30", end: "18:00", price: 2400, state: "free" },
    { id: "b9", start: "18:00", end: "19:30", price: 3000, state: "booked" },
    { id: "b10", start: "19:30", end: "21:00", price: 3000, state: "held" },
    { id: "b11", start: "21:00", end: "22:30", price: 3000, state: "free" },
    { id: "b12", start: "22:30", end: "00:00", price: 3000, state: "free" },
    { id: "b13", start: "00:00", end: "01:30", price: 2400, state: "free" },
    { id: "b14", start: "01:30", end: "03:00", price: 2400, state: "booked" },
];

/* ---------------- bookings (My bookings) ---------------- */
export const myBookings = [
    {
        id: "TZ-8F2K1",
        pitch: "Pitch B",
        format: "7-a-side",
        date: "2026-10-17",
        start: "21:00",
        end: "22:30",
        total: 2400,
        discount: 600,
        status: "confirmed",
        paidWith: "bKash",
    },
    {
        id: "TZ-7Q9LM",
        pitch: "Pitch A",
        format: "5-a-side",
        date: "2026-10-12",
        start: "06:00",
        end: "07:30",
        total: 1680,
        discount: 0,
        status: "held",
        holdMinutesLeft: 11,
        paidWith: null,
    },
    {
        id: "TZ-5C3XA",
        pitch: "Pitch A",
        format: "5-a-side",
        date: "2026-10-03",
        start: "22:30",
        end: "00:00",
        total: 3000,
        discount: 0,
        status: "completed",
        paidWith: "Visa",
    },
    {
        id: "TZ-4D8PT",
        pitch: "Box Cricket",
        format: "6-a-side cricket",
        date: "2026-09-27",
        start: "19:30",
        end: "21:00",
        total: 2100,
        discount: 0,
        status: "cancelled",
        paidWith: null,
    },
];
