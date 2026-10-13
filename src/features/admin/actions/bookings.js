// src/features/admin/actions/bookings.js
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { isBlockPast } from "@/lib/time";
import { expireStaleHolds, getPitchById, resolveBlock } from "@/features/booking/queries";

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const u = session?.user;
    if (!u || u.role !== "admin") return null;
    return u;
}

const DENIED = { ok: false, error: "Only admins can change bookings." };

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
        if (!parsed.success) return { ok: false, error: "Booking not found." };
        const { bookingId, reason } = parsed.data;

        const [b] = await db
            .select({ status: bookings.status, paymentStatus: bookings.paymentStatus })
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .limit(1);
        if (!b) return { ok: false, error: "Booking not found." };
        if (!["held", "confirmed"].includes(b.status)) return { ok: false, error: "This booking is already cancelled or expired." };

        await db
            .update(bookings)
            .set({
                status: "cancelled",
                cancelledAt: new Date(),
                cancelReason: reason || `Cancelled by ${admin.name}`,
                paymentStatus: b.paymentStatus === "paid" ? "refund_due" : b.paymentStatus,
                updatedAt: new Date(),
            })
            .where(and(eq(bookings.id, bookingId), inArray(bookings.status, ["held", "confirmed"])));

        revalidateAll();
        return { ok: true, data: { refundDue: b.paymentStatus === "paid" } };
    } catch (err) {
        console.error("[adminCancelBooking]", err);
        return { ok: false, error: "Couldn't cancel the booking. Try again." };
    }
}

/** Mark a refund as done (after refunding by bKash/bank/SSLCommerz panel). */
export async function markRefunded(bookingId) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "Booking not found." };

        const rows = await db
            .update(bookings)
            .set({ paymentStatus: "refunded", updatedAt: new Date() })
            .where(and(eq(bookings.id, bookingId), eq(bookings.paymentStatus, "refund_due")))
            .returning({ id: bookings.id });
        if (rows.length === 0) return { ok: false, error: "This booking has no refund waiting." };

        revalidateAll();
        return { ok: true };
    } catch (err) {
        console.error("[markRefunded]", err);
        return { ok: false, error: "Couldn't update the refund. Try again." };
    }
}

/* -------------------------------------------------------------- */
/* Walk-in / phone booking                                         */
/* -------------------------------------------------------------- */

const walkInSchema = z.object({
    pitchId: z.string().uuid(),
    blockId: z.string().min(1).max(64),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    customerName: z.string().trim().min(2, "Enter the player's name.").max(60),
    customerPhone: z
        .string()
        .trim()
        .regex(/^(\+?88)?01[3-9]\d{8}$/, "Enter a Bangladeshi mobile number, e.g. 01712345678."),
    paidAtVenue: z.boolean().optional().default(false),
});

/** Admin books a slot for a player at the desk or on the phone. Confirmed immediately. */
export async function createWalkInBooking(input) {
    try {
        if (!(await requireAdmin())) return DENIED;
        const parsed = walkInSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
        const v = parsed.data;

        const pitch = await getPitchById(v.pitchId);
        if (!pitch) return { ok: false, error: "This ground is closed for booking." };

        const block = await resolveBlock(pitch, v.date, v.blockId);
        if (!block) return { ok: false, error: "That time slot no longer exists." };
        if (isBlockPast(v.date, block.startTime)) return { ok: false, error: "That slot has already started." };

        await expireStaleHolds({ pitchId: v.pitchId, date: v.date });

        const price = String(block.price);
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const [row] = await db
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
                revalidateAll();
                return { ok: true, data: row };
            } catch (err) {
                if (!isUniqueViolation(err)) throw err;
                const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "") + String(err?.cause?.constraint ?? "");
                if (!msg.includes("bookings_code_unique")) {
                    return { ok: false, error: "That slot is already booked or on hold." };
                }
            }
        }
        return { ok: false, error: "Couldn't create the booking. Try again." };
    } catch (err) {
        console.error("[createWalkInBooking]", err);
        return { ok: false, error: "Couldn't create the booking. Try again." };
    }
}