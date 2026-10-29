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
        if (!parsed.success) return { ok: false, error: "অজানা পেমেন্ট মাধ্যম।" };
        const { gateway, enabled } = parsed.data;
        if (enabled && !isGatewayConfigured(gateway)) {
            return { ok: false, error: `সার্ভারে ${gatewayName(gateway)}-এর কী সেট করা নেই, তাই এটি চালু করা যাবে না।` };
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
        return { ok: false, error: "পেমেন্ট মাধ্যম বদলানো যায়নি। আবার চেষ্টা করুন।" };
    }
}

const OUTCOME_TEXT = {
    confirmed: () => "পেমেন্ট হয়েছে। বুকিং কনফার্মড।",
    slot_lost: () => "পেমেন্ট হয়েছে, কিন্তু স্লটটি আগেই বুক হয়ে গিয়েছিল। বুকিংটিতে টাকা ফেরত বাকি লেখা হয়েছে।",
    duplicate: () => "একই বুকিংয়ের জন্য দুবার পেমেন্ট হয়েছে। এই পেমেন্টে টাকা ফেরত বাকি লেখা হয়েছে।",
    not_paid: (g) => `${g}-এ এই লেনদেনের কোনো সম্পন্ন পেমেন্ট নেই।`,
    pending: (g) => `${g} থেকে উত্তর আসেনি। এক মিনিট পরে আবার চেষ্টা করুন।`,
    invalid: (g) => `${g} বলছে এই পেমেন্টটি সঠিক নয়।`,
    unknown: () => "এই লেনদেনটি ডাটাবেসে নেই।",
};

/** Ask the payment's gateway (SSLCommerz or bKash) about a transaction and confirm the booking if it was paid. */
export async function adminRecheckPayment(tranId) {
    try {
        if (!(await requireRoles(ADMIN_ONLY))) return DENIED;
        if (typeof tranId !== "string" || !tranId || tranId.length > 40) return { ok: false, error: "লেনদেনটি পাওয়া যায়নি।" };
        const [p] = await db.select({ gateway: payments.gateway }).from(payments).where(eq(payments.tranId, tranId)).limit(1);
        if (!p) return { ok: false, error: "লেনদেনটি পাওয়া যায়নি।" };
        const name = gatewayName(p.gateway);
        if (!isGatewayConfigured(p.gateway)) return { ok: false, error: `${name} সেট আপ করা নেই, তাই এই পেমেন্ট যাচাই করা যাবে না।` };
        const r = await recheckPayment(tranId);
        refresh();
        const text = OUTCOME_TEXT[r.outcome];
        return { ok: true, data: { outcome: r.outcome, message: text ? text(name) : "যাচাই করা হয়েছে।" } };
    } catch (err) {
        console.error("[adminRecheckPayment]", err);
        return { ok: false, error: "পেমেন্ট যাচাই করা যায়নি। আবার চেষ্টা করুন।" };
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
        if (!z.string().uuid().safeParse(paymentId).success) return { ok: false, error: "পেমেন্টটি পাওয়া যায়নি।" };
        const [p] = await db
            .select({ riskTitle: payments.riskTitle })
            .from(payments)
            .where(and(eq(payments.id, paymentId), eq(payments.riskLevel, "1")))
            .limit(1);
        if (!p) return { ok: false, error: "এই পেমেন্টকে ঝুঁকিপূর্ণ বলা হয়নি।" };
        const note = `${me.name} যাচাই করেছেন${p.riskTitle ? ` (আগে ছিল: ${p.riskTitle})` : ""}`.slice(0, 200);
        await db
            .update(payments)
            .set({ riskLevel: "0", riskTitle: note, updatedAt: new Date() })
            .where(and(eq(payments.id, paymentId), eq(payments.riskLevel, "1")));
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[markRiskChecked]", err);
        return { ok: false, error: "পেমেন্ট আপডেট হয়নি। আবার চেষ্টা করুন।" };
    }
}

/**
 * Record that a refund was sent (from the SSLCommerz or bKash merchant panel, or cash).
 * Works for a refund-due payment, and for a paid payment whose booking is refund due.
 */
export async function markPaymentRefunded(paymentId) {
    try {
        if (!(await requireRoles(ADMIN_ONLY))) return DENIED;
        if (!z.string().uuid().safeParse(paymentId).success) return { ok: false, error: "পেমেন্টটি পাওয়া যায়নি।" };

        const [p] = await db
            .select({ id: payments.id, status: payments.status, bookingId: payments.bookingId, bookingPayment: bookings.paymentStatus })
            .from(payments)
            .innerJoin(bookings, eq(payments.bookingId, bookings.id))
            .where(eq(payments.id, paymentId))
            .limit(1);
        if (!p) return { ok: false, error: "পেমেন্টটি পাওয়া যায়নি।" };

        const due = p.status === "refund_due" || (p.status === "paid" && p.bookingPayment === "refund_due");
        if (!due) return { ok: false, error: "এই পেমেন্টে কোনো টাকা ফেরত বাকি নেই।" };

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
        return { ok: false, error: "টাকা ফেরতের তথ্য আপডেট হয়নি। আবার চেষ্টা করুন।" };
    }
}