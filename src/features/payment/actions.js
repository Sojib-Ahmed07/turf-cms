// src/features/payment/actions.js
"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { startPayment } from "./service";
import { GATEWAYS, getPayMethods } from "./methods";
import { getI18n } from "@/i18n/server";

/**
 * Player clicks Pay (on /book right after reserving, on My bookings, or "Try again" on /payment/failed).
 * method: "bkash" | "sslcommerz"; empty = the first method that is switched on.
 * Returns { ok: true, data: { url } } -> the browser goes to the bKash or SSLCommerz page,
 * or { ok: false, error, needsLogin?, needsVerify?, expired? },
 * or { ok: false, methodOff: true, off: { id, label } | null, available: [{ id, label, hint, enabled }] }
 *   when the admin switched that method (or every method) off; the client shows "use this one instead".
 */
export async function payForBooking(bookingId, method = "") {
    const i18n = await getI18n();
    const { t } = i18n;
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const user = session?.user;
        if (!user) return { ok: false, needsLogin: true, error: t("errors.signInToPay") };
        if (!user.emailVerified) {
            return {
                ok: false,
                needsVerify: true,
                error: t("errors.verifyToPay"),
            };
        }
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: t("errors.bookingNotFound") };

        const methods = await getPayMethods();
        if (!methods.length) return { ok: false, error: t("errors.paymentNotSetUp") };
        const available = methods.filter((m) => m.enabled);
        if (method && !GATEWAYS.includes(method)) return { ok: false, error: t("errors.pickMethod") };

        const wanted = method ? methods.find((m) => m.id === method) : available[0];
        if (!wanted || !wanted.enabled) {
            const off = wanted ? { id: wanted.id, label: t(`pay.${wanted.id}.label`) } : null;
            return {
                ok: false,
                methodOff: true,
                off,
                available,
                error: off ? t("errors.methodOff", { method: off.label }) : t("errors.paymentsOff"),
            };
        }
        return await startPayment(bookingId, user, wanted.id, i18n);
    } catch (err) {
        console.error("[payForBooking]", err);
        return { ok: false, error: t("errors.openPaymentFailed") };
    }
}