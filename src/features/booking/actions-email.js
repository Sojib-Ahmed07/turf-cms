// src/features/booking/actions-email.js
"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { and, count, eq, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { auditLog, bookings } from "@/db/schema";
import { sendBookingReceiptByBookingId } from "@/features/auth/ticket-email";
import { getI18n } from "@/i18n/server";

// Each resend is logged in audit_log; more than this many in the window is refused, so the button
// can't be used to flood an inbox or burn the Brevo sending quota.
const RESEND_LIMIT = 3;
const RESEND_WINDOW_MIN = 15;

/**
 * Resend the receipt email to the booking's owner.
 * Only that player's confirmed bookings.
 * Returns { ok: true } or { ok: false, error, needsLogin? }.
 */
export async function resendTicketEmail(bookingId) {
    const { t } = await getI18n();
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const user = session?.user;
        if (!user) return { ok: false, needsLogin: true, error: t("actionErrors.signInFirst") };
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: t("actionErrors.bookingNotFound") };

        const [b] = await db
            .select({ status: bookings.status, userId: bookings.userId })
            .from(bookings)
            .where(and(eq(bookings.id, bookingId), eq(bookings.userId, user.id)))
            .limit(1);
        if (!b) return { ok: false, error: t("actionErrors.bookingNotFound") };
        if (b.status !== "confirmed") return { ok: false, error: t("actionErrors.onlyConfirmed") };

        const since = new Date(Date.now() - RESEND_WINDOW_MIN * 60000);
        const [{ n }] = await db
            .select({ n: count() })
            .from(auditLog)
            .where(and(eq(auditLog.action, "receipt_resend"), eq(auditLog.entityId, bookingId), gt(auditLog.createdAt, since)));
        if (n >= RESEND_LIMIT) {
            return {
                ok: false,
                error: t("actionErrors.resendLimit", { count: n, minutes: RESEND_WINDOW_MIN }),
            };
        }

        const sent = await sendBookingReceiptByBookingId(bookingId);
        if (!sent.ok) return { ok: false, error: t("actionErrors.emailFailed") };
        await db.insert(auditLog).values({ actorId: user.id, action: "receipt_resend", entity: "booking", entityId: bookingId });
        return { ok: true };
    } catch (err) {
        console.error("[resendTicketEmail]", err);
        return { ok: false, error: t("actionErrors.emailFailed") };
    }
}