// src/features/admin/actions/payments.js
"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bookings, pageSections, payments } from "@/db/schema";
import { recheckPayment } from "@/features/payment/service";
import { GATEWAYS, SWITCHES_KEY, gatewayName, getPaymentSwitches, isGatewayConfigured } from "@/features/payment/methods";
import { ADMIN_ONLY, DENIED, requireRoles } from "@/features/cms/server-utils";

function refresh() {
    revalidatePath("/admin/payments");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
}

const switchSchema = z.object({ gateway: z.enum(GATEWAYS), enabled: z.boolean() });

/**
 * Admin on/off switch for a payment method. Off = players can't start new payments with it
 * (they're told which method is on instead). Payments already in progress still finish.
 */
export async function setPaymentMethodEnabled(input) {
    try {
        if (!(await requireRoles(ADMIN_ONLY))) return DENIED;
        const parsed = switchSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: "Unknown payment method." };
        const { gateway, enabled } = parsed.data;
        if (enabled && !isGatewayConfigured(gateway)) {
            return { ok: false, error: `${gatewayName(gateway)} keys aren't set on the server, so it can't be turned on.` };
        }

        const data = { ...(await getPaymentSwitches()), [gateway]: enabled };
        await db
            .insert(pageSections)
            .values({ key: SWITCHES_KEY, isVisible: true, data, updatedAt: new Date() })
            .onConflictDoUpdate({ target: pageSections.key, set: { data, updatedAt: new Date() } });

        revalidatePath("/admin/payments");
        revalidatePath("/book");
        revalidatePath("/bookings");
        return { ok: true, data };
    } catch (err) {
        console.error("[setPaymentMethodEnabled]", err);
        return { ok: false, error: "Couldn't change the payment method. Try again." };
    }
}

const OUTCOME_TEXT = {
    confirmed: () => "Paid. The booking is confirmed.",
    slot_lost: () => "Paid, but the slot was already gone. The booking is marked refund due.",
    duplicate: () => "Paid twice for the same booking. This payment is marked refund due.",
    not_paid: (g) => `${g} has no completed payment for this transaction.`,
    pending: (g) => `${g} didn't answer. Try again in a minute.`,
    invalid: (g) => `${g} says this payment isn't valid.`,
    unknown: () => "This transaction isn't in the database.",
};

/** Ask the payment's gateway (SSLCommerz or bKash) about a transaction and confirm the booking if it was paid. */
export async function adminRecheckPayment(tranId) {
    try {
        if (!(await requireRoles(ADMIN_ONLY))) return DENIED;
        if (typeof tranId !== "string" || !tranId || tranId.length > 40) return { ok: false, error: "Transaction not found." };
        const [p] = await db.select({ gateway: payments.gateway }).from(payments).where(eq(payments.tranId, tranId)).limit(1);
        if (!p) return { ok: false, error: "Transaction not found." };
        const name = gatewayName(p.gateway);
        if (!isGatewayConfigured(p.gateway)) return { ok: false, error: `${name} isn't set up, so this payment can't be checked.` };
        const r = await recheckPayment(tranId);
        refresh();
        const text = OUTCOME_TEXT[r.outcome];
        return { ok: true, data: { outcome: r.outcome, message: text ? text(name) : "Checked." } };
    } catch (err) {
        console.error("[adminRecheckPayment]", err);
        return { ok: false, error: "Couldn't check the payment. Try again." };
    }
}

/**
 * The admin checked a payment SSLCommerz flagged as risky (merchant panel) and it's genuine.
 * Clears the flag, so the gate check stops warning about it. The old reason is kept in riskTitle.
 */
export async function markRiskChecked(paymentId) {
    try {
        const me = await requireRoles(ADMIN_ONLY);
        if (!me) return DENIED;
        if (!z.string().uuid().safeParse(paymentId).success) return { ok: false, error: "Payment not found." };
        const [p] = await db
            .select({ riskTitle: payments.riskTitle })
            .from(payments)
            .where(and(eq(payments.id, paymentId), eq(payments.riskLevel, "1")))
            .limit(1);
        if (!p) return { ok: false, error: "This payment isn't flagged as risky." };
        const note = `Checked by ${me.name}${p.riskTitle ? ` (was: ${p.riskTitle})` : ""}`.slice(0, 200);
        await db
            .update(payments)
            .set({ riskLevel: "0", riskTitle: note, updatedAt: new Date() })
            .where(and(eq(payments.id, paymentId), eq(payments.riskLevel, "1")));
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[markRiskChecked]", err);
        return { ok: false, error: "Couldn't update the payment. Try again." };
    }
}

/**
 * Record that a refund was sent (from the SSLCommerz or bKash merchant panel, or cash).
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