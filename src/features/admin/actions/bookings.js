// src/features/admin/actions/bookings.js
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { withLockedTx } from "@/db/pool";
import { bookings, payments } from "@/db/schema";
import { isBlockPast, slotInterval } from "@/lib/time";
import { blockingBooking, expireStaleHolds, getActiveIntervals, getPitchById, resolveBlock } from "@/features/booking/queries";

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const u = session?.user;
    if (!u || u.role !== "admin") return null;
    return u;
}

const DENIED = { ok: false, error: "শুধু অ্যাডমিন বুকিং বদলাতে পারেন।" };

function revalidateAll() {
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath("/book");
    revalidatePath("/bookings");
}

function bookingCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    return "TZ-" + Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function isUniqueViolation(err) {
    const code = err?.code ?? err?.cause?.code;
    const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "");
    return code === "23505" || msg.includes("duplicate key");
}

/* -------------------------------------------------------------- */
/* Cancel                                                          */
/* -------------------------------------------------------------- */

const cancelSchema = z.object({
    bookingId: z.string().uuid(),
    reason: z.string().trim().max(200).optional().default(""),
});

/**
 * Cancel a held or confirmed booking. A paid booking is marked refund_due,
 * so the refund shows up in the payments list until it's handled.
 */
export async function adminCancelBooking(input) {
    try {
        const admin = await requireAdmin();
        if (!admin) return DENIED;
        const parsed = cancelSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: "বুকিংটি পাওয়া যায়নি।" };
        const { bookingId, reason } = parsed.data;

        const [b] = await db
            .select({ status: bookings.status, paymentStatus: bookings.paymentStatus })
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .limit(1);
        if (!b) return { ok: false, error: "বুকিংটি পাওয়া যায়নি।" };
        if (!["held", "confirmed"].includes(b.status)) return { ok: false, error: "এই বুকিং আগেই ক্যানসেল হয়েছে বা মেয়াদ শেষ।" };

        await db
            .update(bookings)
            .set({
                status: "cancelled",
                cancelledAt: new Date(),
                cancelReason: reason || `${admin.name} ক্যানসেল করেছেন`,
                paymentStatus: b.paymentStatus === "paid" ? "refund_due" : b.paymentStatus,
                updatedAt: new Date(),
            })
            .where(and(eq(bookings.id, bookingId), inArray(bookings.status, ["held", "confirmed"])));

        revalidateAll();
        return { ok: true, data: { refundDue: b.paymentStatus === "paid" } };
    } catch (err) {
        console.error("[adminCancelBooking]", err);
        return { ok: false, error: "বুকিং ক্যানসেল করা যায়নি। আবার চেষ্টা করুন।" };
    }
}

/** Mark a refund as done (after refunding by bKash/bank/SSLCommerz panel). */
export async function markRefunded(bookingId) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "বুকিংটি পাওয়া যায়নি।" };

        const rows = await db
            .update(bookings)
            .set({ paymentStatus: "refunded", updatedAt: new Date() })
            .where(and(eq(bookings.id, bookingId), eq(bookings.paymentStatus, "refund_due")))
            .returning({ id: bookings.id });
        if (rows.length === 0) return { ok: false, error: "এই বুকিংয়ে কোনো টাকা ফেরত বাকি নেই।" };

        // Keep the Payments page in step: the paid attempt for this booking is now refunded.
        await db
            .update(payments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(and(eq(payments.bookingId, bookingId), inArray(payments.status, ["paid", "refund_due"])));

        revalidateAll();
        revalidatePath("/admin/payments");
        return { ok: true };
    } catch (err) {
        console.error("[markRefunded]", err);
        return { ok: false, error: "টাকা ফেরতের তথ্য আপডেট হয়নি। আবার চেষ্টা করুন।" };
    }
}

/** A walk-in booked as "pay at venue" was paid at the desk: count it as paid (and in revenue). */
export async function markPaidAtDesk(bookingId) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "বুকিংটি পাওয়া যায়নি।" };
        const rows = await db
            .update(bookings)
            .set({ paymentStatus: "paid", updatedAt: new Date() })
            .where(
                and(
                    eq(bookings.id, bookingId),
                    eq(bookings.source, "walk_in"),
                    eq(bookings.status, "confirmed"),
                    eq(bookings.paymentStatus, "unpaid")
                )
            )
            .returning({ id: bookings.id });
        if (rows.length === 0) return { ok: false, error: "শুধু কাউন্টারের যেসব বুকিংয়ে পেমেন্ট বাকি, সেগুলোকেই এখানে পেমেন্ট হয়েছে বলে চিহ্নিত করা যায়।" };
        revalidateAll();
        return { ok: true };
    } catch (err) {
        console.error("[markPaidAtDesk]", err);
        return { ok: false, error: "বুকিং আপডেট হয়নি। আবার চেষ্টা করুন।" };
    }
}

/* -------------------------------------------------------------- */
/* Walk-in / phone booking                                         */
/* -------------------------------------------------------------- */

const walkInSchema = z.object({
    pitchId: z.string().uuid(),
    blockId: z.string().min(1).max(64),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    customerName: z.string().trim().min(2, "খেলোয়াড়ের নাম লিখুন।").max(60),
    customerPhone: z
        .string()
        .trim()
        .regex(/^(\+?88)?01[3-9]\d{8}$/, "বাংলাদেশি মোবাইল নম্বর দিন, যেমন 01712345678।"),
    paidAtVenue: z.boolean().optional().default(false),
});

/** Admin books a slot for a player at the desk or on the phone. Confirmed immediately. */
export async function createWalkInBooking(input) {
    try {
        if (!(await requireAdmin())) return DENIED;
        const parsed = walkInSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ফর্মটি দেখে নিন।" };
        const v = parsed.data;

        const pitch = await getPitchById(v.pitchId);
        if (!pitch) return { ok: false, error: "এই মাঠে বুকিং বন্ধ আছে।" };

        const block = await resolveBlock(pitch, v.date, v.blockId);
        if (!block) return { ok: false, error: "এই স্লটটি আর নেই।" };
        if (v.startTime && v.startTime !== block.startTime) {
            return { ok: false, error: "এইমাত্র এই স্লটের সময় বদলেছে। এই উইন্ডো বন্ধ করে আবার স্লট সিলেক্ট করুন।" };
        }
        if (isBlockPast(v.date, block.startTime, block.dayStart)) return { ok: false, error: "এই স্লটের সময় শুরু হয়ে গেছে।" };

        await expireStaleHolds({ pitchId: v.pitchId, date: v.date });

        const price = String(block.price);
        const interval = slotInterval(v.date, block.startTime, block.endTime, block.dayStart);
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const row = await withLockedTx([`pitch:${v.pitchId}`], async (tx) => {
                    // Same rule as online holds: nothing active may overlap this slot's real time.
                    const active = await getActiveIntervals(v.pitchId, [v.date], { exec: tx });
                    if (blockingBooking(active, interval)) return null;
                    const [inserted] = await tx
                        .insert(bookings)
                        .values({
                            code: bookingCode(),
                            userId: null,
                            customerName: v.customerName,
                            customerPhone: v.customerPhone,
                            pitchId: v.pitchId,
                            timeBlockId: block.dbId,
                            bookingDate: v.date,
                            startTime: block.startTime,
                            endTime: block.endTime,
                            subtotal: price,
                            discount: "0",
                            totalPrice: price,
                            status: "confirmed",
                            paymentStatus: v.paidAtVenue ? "paid" : "unpaid",
                            source: "walk_in",
                        })
                        .returning({ id: bookings.id, code: bookings.code });
                    return inserted;
                });
                if (!row) return { ok: false, error: "এই স্লটটি আগেই বুক হয়ে গেছে বা পেমেন্ট চলছে।" };
                revalidateAll();
                return { ok: true, data: row };
            } catch (err) {
                if (!isUniqueViolation(err)) throw err;
                const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "") + String(err?.cause?.constraint ?? "");
                if (!msg.includes("bookings_code_unique")) {
                    return { ok: false, error: "এই স্লটটি আগেই বুক হয়ে গেছে বা পেমেন্ট চলছে।" };
                }
            }
        }
        return { ok: false, error: "বুকিং তৈরি হয়নি। আবার চেষ্টা করুন।" };
    } catch (err) {
        console.error("[createWalkInBooking]", err);
        return { ok: false, error: "বুকিং তৈরি হয়নি। আবার চেষ্টা করুন।" };
    }
}