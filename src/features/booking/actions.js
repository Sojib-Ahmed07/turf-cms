// src/features/booking/actions.js
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { isBlockPast } from "@/lib/time";
import { HOLD_MINUTES, expireStaleHolds, getPitchById, resolveBlock } from "./queries";

const MAX_ACTIVE_HOLDS = 2; // stops one player from blocking the whole evening

const holdSchema = z.object({
    pitchId: z.string().uuid(),
    blockId: z.string().min(1).max(64),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function currentUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
}

/** "TZ-8F2K1": short code shown on tickets. No 0/O/1/I to avoid confusion. */
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

/**
 * Step 1 of checkout: reserve the slot for HOLD_MINUTES.
 * Returns { ok, data: { bookingId, code } } or { ok: false, error, needsLogin? }.
 * Step 2 (SSLCommerz) will turn this hold into a payment.
 */
export async function createBookingHold(input) {
    try {
        const user = await currentUser();
        if (!user) return { ok: false, needsLogin: true, error: "Sign in to book a slot." };

        const parsed = holdSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: "Pick a ground, date and time first." };
        const { pitchId, blockId, date } = parsed.data;

        const pitch = await getPitchById(pitchId);
        if (!pitch) return { ok: false, error: "This ground isn't taking bookings right now." };

        const block = await resolveBlock(pitch, date, blockId);
        if (!block) return { ok: false, error: "That time slot no longer exists. Pick another time." };

        if (isBlockPast(date, block.startTime)) {
            return { ok: false, error: "That slot has already started. Pick a later time." };
        }

        // Free up slots whose holds ran out, so the unique index doesn't block them.
        await expireStaleHolds({ pitchId, date });

        // Limit concurrent holds per player.
        const now = new Date();
        const active = await db
            .select({ id: bookings.id })
            .from(bookings)
            .where(and(eq(bookings.userId, user.id), eq(bookings.status, "held"), gt(bookings.holdExpiresAt, now)));
        if (active.length >= MAX_ACTIVE_HOLDS) {
            return {
                ok: false,
                error: `You already have ${active.length} slots waiting for payment. Pay for or cancel one first.`,
            };
        }

        const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);
        const price = String(block.price);

        // Retry only if the random booking code collides (very rare).
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const [row] = await db
                    .insert(bookings)
                    .values({
                        code: bookingCode(),
                        userId: user.id,
                        customerName: user.name,
                        customerPhone: user.phone ?? null,
                        pitchId,
                        timeBlockId: block.dbId,
                        bookingDate: date,
                        startTime: block.startTime,
                        endTime: block.endTime,
                        subtotal: price,
                        discount: "0",
                        totalPrice: price,
                        status: "held",
                        paymentStatus: "unpaid",
                        source: "online",
                        holdExpiresAt,
                    })
                    .returning({ id: bookings.id, code: bookings.code });

                revalidatePath("/bookings");
                return { ok: true, data: { bookingId: row.id, code: row.code, holdExpiresAt: holdExpiresAt.toISOString() } };
            } catch (err) {
                if (!isUniqueViolation(err)) throw err;
                const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "") + String(err?.cause?.constraint ?? "");
                // Booking-code collision: loop and try a new code. Anything else means the slot is taken.
                if (!msg.includes("bookings_code_unique")) {
                    return { ok: false, error: "Someone just booked this slot. Pick another time." };
                }
            }
        }
        return { ok: false, error: "Couldn't reserve the slot. Try again." };
    } catch (err) {
        console.error("[createBookingHold]", err);
        return { ok: false, error: "Couldn't reserve the slot. Try again." };
    }
}

/** Player cancels a booking that is still waiting for payment. */
export async function cancelHeldBooking(bookingId) {
    try {
        const user = await currentUser();
        if (!user) return { ok: false, needsLogin: true, error: "Sign in first." };
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "Booking not found." };

        const rows = await db
            .update(bookings)
            .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "Cancelled by player before payment", updatedAt: new Date() })
            .where(and(eq(bookings.id, bookingId), eq(bookings.userId, user.id), inArray(bookings.status, ["held"])))
            .returning({ id: bookings.id });

        if (rows.length === 0) {
            return { ok: false, error: "Only bookings waiting for payment can be cancelled here. For paid bookings, call the desk." };
        }
        revalidatePath("/bookings");
        return { ok: true };
    } catch (err) {
        console.error("[cancelHeldBooking]", err);
        return { ok: false, error: "Couldn't cancel the booking. Try again." };
    }
}