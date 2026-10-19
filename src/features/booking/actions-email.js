// src/features/booking/actions-email.js
"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { sendBookingReceiptByBookingId } from "@/features/auth/ticket-email";

/**
 * Resend the receipt email to the booking's owner.
 * Only that player's confirmed bookings.
 * Returns { ok: true } or { ok: false, error, needsLogin? }.
 */
export async function resendTicketEmail(bookingId) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const user = session?.user;
        if (!user) return { ok: false, needsLogin: true, error: "Sign in first." };
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "Booking not found." };

        const [b] = await db
            .select({ status: bookings.status, userId: bookings.userId })
            .from(bookings)
            .where(and(eq(bookings.id, bookingId), eq(bookings.userId, user.id)))
            .limit(1);
        if (!b) return { ok: false, error: "Booking not found." };
        if (b.status !== "confirmed") return { ok: false, error: "Only confirmed bookings get a receipt." };

        const sent = await sendBookingReceiptByBookingId(bookingId);
        if (!sent.ok) return { ok: false, error: sent.error || "Couldn't send the email. Try again." };
        return { ok: true };
    } catch (err) {
        console.error("[resendTicketEmail]", err);
        return { ok: false, error: "Couldn't send the email. Try again." };
    }
}