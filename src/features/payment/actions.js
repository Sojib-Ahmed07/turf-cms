// src/features/payment/actions.js
"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { startPayment } from "./service";

/**
 * Player clicks Pay (on /book right after reserving, on My bookings, or "Try again" on /payment/failed).
 * Returns { ok: true, data: { url } } -> the browser goes to the SSLCommerz page,
 * or { ok: false, error, needsLogin?, expired? }.
 */
export async function payForBooking(bookingId) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const user = session?.user;
        if (!user) return { ok: false, needsLogin: true, error: "Sign in to pay for your booking." };
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "Booking not found." };
        return await startPayment(bookingId, user);
    } catch (err) {
        console.error("[payForBooking]", err);
        return { ok: false, error: "Couldn't open the payment page. Try again." };
    }
}