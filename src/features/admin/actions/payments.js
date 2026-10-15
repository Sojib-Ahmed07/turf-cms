// src/features/admin/actions/payments.js
"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { recheckPayment } from "@/features/payment/service";
import { isSslczConfigured } from "@/lib/sslcommerz";
import { ADMIN_ONLY, DENIED, requireRoles } from "@/features/cms/server-utils";

function refresh() {
    revalidatePath("/admin/payments");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
}

const OUTCOME_TEXT = {
    confirmed: "Paid. The booking is confirmed.",
    slot_lost: "Paid, but the slot was already gone. The booking is marked refund due.",
    duplicate: "Paid twice for the same booking. This payment is marked refund due.",
    not_paid: "SSLCommerz has no completed payment for this transaction.",
    pending: "SSLCommerz didn't answer. Try again in a minute.",
    invalid: "SSLCommerz says this payment isn't valid.",
    unknown: "This transaction isn't in the database.",
};

/** Ask SSLCommerz about a transaction and confirm the booking if it was paid. */
export async function adminRecheckPayment(tranId) {
    try {
        if (!(await requireRoles(ADMIN_ONLY))) return DENIED;
        if (typeof tranId !== "string" || !tranId || tranId.length > 40) return { ok: false, error: "Transaction not found." };
        if (!isSslczConfigured()) return { ok: false, error: "SSLCommerz isn't set up, so payments can't be checked." };
        const r = await recheckPayment(tranId);
        refresh();
        return { ok: true, data: { outcome: r.outcome, message: OUTCOME_TEXT[r.outcome] ?? "Checked." } };
    } catch (err) {
        console.error("[adminRecheckPayment]", err);
        return { ok: false, error: "Couldn't check the payment. Try again." };
    }
}

/**
 * Record that a refund was sent (from the SSLCommerz merchant panel, bKash or cash).
 * Works for a refund-due payment, and for a paid payment whose booking is refund due.
 */
export async function markPaymentRefunded(paymentId) {
    try {
        if (!(await requireRoles(ADMIN_ONLY))) return DENIED;
        if (!z.string().uuid().safeParse(paymentId).success) return { ok: false, error: "Payment not found." };

        const [p] = await db
            .select({ id: payments.id, status: payments.status, bookingId: payments.bookingId, bookingPayment: bookings.paymentStatus })
            .from(payments)
            .innerJoin(bookings, eq(payments.bookingId, bookings.id))
            .where(eq(payments.id, paymentId))
            .limit(1);
        if (!p) return { ok: false, error: "Payment not found." };

        const due = p.status === "refund_due" || (p.status === "paid" && p.bookingPayment === "refund_due");
        if (!due) return { ok: false, error: "This payment has no refund waiting." };

        await db
            .update(payments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(and(eq(payments.id, p.id), inArray(payments.status, ["paid", "refund_due"])));
        if (p.bookingPayment === "refund_due") {
            await db
                .update(bookings)
                .set({ paymentStatus: "refunded", updatedAt: new Date() })
                .where(and(eq(bookings.id, p.bookingId), eq(bookings.paymentStatus, "refund_due")));
        }
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[markPaymentRefunded]", err);
        return { ok: false, error: "Couldn't update the refund. Try again." };
    }
}