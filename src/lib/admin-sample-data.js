// src/lib/admin-sample-data.js
// Sample rows for the admin UI phase.
import { heroSlides, pitches } from "./sample-data";

export const adminUser = { name: "Said", role: "admin" };

export const stats = {
    todayBookings: 14,
    todayRevenue: 33600,
    monthRevenue: 612400,
    monthChange: 12, // % vs last month
    pendingHolds: 3,
    occupancyTonight: 78, // %
};

/* Tonight's board: one row per pitch, blocks by status */
export const tonight = pitches.map((p, i) => ({
    pitch: p.name,
    blocks: [
        { start: "16:30", end: "18:00", status: i === 2 ? "free" : "confirmed", who: "Arif H." },
        { start: "18:00", end: "19:30", status: "confirmed", who: i === 1 ? "Dhaka Strikers" : "Nabil R." },
        { start: "19:30", end: "21:00", status: i === 0 ? "held" : "confirmed", who: i === 0 ? "Tanvir A." : "Sakib K." },
        { start: "21:00", end: "22:30", status: i === 1 ? "confirmed" : "free", who: "FC Mirpur" },
        { start: "22:30", end: "00:00", status: i === 0 ? "confirmed" : "free", who: "Office League" },
        { start: "00:00", end: "01:30", status: i === 2 ? "confirmed" : "free", who: "Night Owls" },
    ],
}));

export const recentBookings = [
    { id: "TZ-8F2K1", customer: "Rafi Ahmed", phone: "01711-234567", pitch: "Pitch B", date: "17 Oct", time: "9 pm to 10:30 pm", amount: 2400, status: "confirmed", method: "bKash", created: "2 min ago" },
    { id: "TZ-7Q9LM", customer: "Tanvir Alam", phone: "01819-552210", pitch: "Pitch A", date: "12 Oct", time: "6 am to 7:30 am", amount: 1680, status: "held", method: null, created: "6 min ago" },
    { id: "TZ-6H1ZR", customer: "Nusrat Jahan", phone: "01911-090909", pitch: "Box Cricket", date: "11 Oct", time: "6 pm to 7:30 pm", amount: 2100, status: "confirmed", method: "Nagad", created: "21 min ago" },
    { id: "TZ-5C3XA", customer: "Sakib Khan", phone: "01558-777001", pitch: "Pitch A", date: "11 Oct", time: "10:30 pm to 12 am", amount: 3000, status: "confirmed", method: "Visa", created: "1 hr ago" },
    { id: "TZ-4D8PT", customer: "Imran Hossain", phone: "01722-118822", pitch: "Pitch B", date: "10 Oct", time: "7:30 pm to 9 pm", amount: 3000, status: "cancelled", method: null, created: "3 hr ago" },
    { id: "TZ-3K2WQ", customer: "Office League", phone: "01600-121212", pitch: "Pitch B", date: "10 Oct", time: "9 pm to 10:30 pm", amount: 2400, status: "refund_due", method: "bKash", created: "5 hr ago" },
    { id: "TZ-2B7YU", customer: "Arif Hasan", phone: "01313-454545", pitch: "Pitch A", date: "9 Oct", time: "4:30 pm to 6 pm", amount: 2400, status: "completed", method: "Rocket", created: "Yesterday" },
];

export const payments = [
    { tranId: "TZ-PAY-01HF8X", bookingId: "TZ-8F2K1", amount: 2400, method: "bKash", bankTranId: "BKA81XQ2ZP", status: "valid", risk: "0", at: "11 Oct, 8:52 pm" },
    { tranId: "TZ-PAY-01HF8V", bookingId: "TZ-7Q9LM", amount: 1680, method: "—", bankTranId: "—", status: "initiated", risk: "—", at: "11 Oct, 8:48 pm" },
    { tranId: "TZ-PAY-01HF8Q", bookingId: "TZ-6H1ZR", amount: 2100, method: "Nagad", bankTranId: "NGD7781200", status: "valid", risk: "0", at: "11 Oct, 8:33 pm" },
    { tranId: "TZ-PAY-01HF7Z", bookingId: "TZ-4D8PT", amount: 3000, method: "Visa", bankTranId: "—", status: "failed", risk: "—", at: "11 Oct, 5:10 pm" },
    { tranId: "TZ-PAY-01HF7M", bookingId: "TZ-3K2WQ", amount: 2400, method: "bKash", bankTranId: "BKA77ZZ0Q1", status: "valid", risk: "1", at: "11 Oct, 3:40 pm" },
];

export const coupons = [
    { code: "NIGHT20", type: "percent", value: 20, maxDiscount: 800, used: 142, limit: 500, ends: "31 Oct", active: true, banner: "Weekend nights" },
    { code: "EARLY30", type: "percent", value: 30, maxDiscount: 600, used: 58, limit: null, ends: "No end date", active: true, banner: "Booking page" },
    { code: "FIRST200", type: "fixed", value: 200, maxDiscount: null, used: 311, limit: null, ends: "No end date", active: true, banner: "Popup" },
    { code: "EID500", type: "fixed", value: 500, maxDiscount: null, used: 96, limit: 100, ends: "Ended 20 Jun", active: false, banner: null },
];

export const media = [
    ...heroSlides.map((s, i) => ({ id: `m${i}`, url: s.imageUrl, name: `hero-${i + 1}.jpg`, folder: "hero", size: "412 KB", dims: "2400 × 1050" })),
    ...pitches.map((p, i) => ({ id: `p${i}`, url: p.imageUrl, name: `${p.name.toLowerCase().replace(/\s/g, "-")}.jpg`, folder: "pitches", size: "286 KB", dims: "1600 × 1000" })),
];

export const users = [
    { name: "Said", email: "said@turfzone.com.bd", role: "admin", bookings: 0, joined: "Jan 2026" },
    { name: "Mitu Akter", email: "mitu@turfzone.com.bd", role: "editor", bookings: 0, joined: "Mar 2026" },
    { name: "Rafi Ahmed", email: "rafi.ahmed@gmail.com", role: "user", bookings: 23, joined: "Feb 2026" },
    { name: "Nusrat Jahan", email: "nusrat.j@yahoo.com", role: "user", bookings: 9, joined: "May 2026" },
    { name: "Tanvir Alam", email: "tanvir.alam@gmail.com", role: "user", bookings: 4, joined: "Sep 2026" },
];
