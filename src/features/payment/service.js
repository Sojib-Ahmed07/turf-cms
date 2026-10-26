// src/features/payment/service.js
import "server-only";
import { waitUntil } from "@vercel/functions";
import { and, eq, inArray, lt, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, pitches } from "@/db/schema";
import { initSession, queryTransaction, validateOrder } from "@/lib/sslcommerz";
import { createPayment as bkashCreate, executePayment as bkashExecute, queryPayment as bkashQuery } from "@/lib/bkash";
import { GATEWAYS, isGatewayConfigured } from "./methods";
import { HOLD_MINUTES, getSheetDayStarts } from "@/features/booking/queries";
import { redeemCoupon } from "@/features/coupons/service";
import { sendBookingReceiptByBookingId } from "@/features/auth/ticket-email";
import { shortDateLabel } from "@/lib/time";
import { time12 } from "@/lib/utils";

const MAX_HOLD_MINUTES = 30;

function appUrl() {
    return (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function newTranId(code) {
    const suffix = Date.now().toString(36).toUpperCase().slice(-6);
    return `${code}-${suffix}`.slice(0, 30);
}

function isUniqueViolation(err) {
    const code = err?.code ?? err?.cause?.code;
    const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "");
    return code === "23505" || msg.includes("duplicate key");
}

const sameAmount = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;

/* -------------------------------------------------------------- */
/* Start                                                           */
/* -------------------------------------------------------------- */

/**
 * Open a payment for a held booking. method: "bkash" | "sslcommerz" (see methods.js).
 * Returns { ok: true, data: { url } } (the browser goes there) or { ok: false, error, expired? }.
 * i18n (optional): { t } from getI18n(), for messages in the player's language (English without it).
 */
export async function startPayment(bookingId, user, method = "sslcommerz", i18n = null) {
    const msg = (key, english) => (i18n ? i18n.t(`errors.${key}`) : english);
    const gateway = GATEWAYS.includes(method) ? method : "sslcommerz";
    if (!isGatewayConfigured(gateway)) return { ok: false, error: msg("methodUnavailable", "That payment method isn't available right now. Pick another.") };

    const [b] = await db
        .select({
            id: bookings.id,
            code: bookings.code,
            userId: bookings.userId,
            status: bookings.status,
            paymentStatus: bookings.paymentStatus,
            totalPrice: bookings.totalPrice,
            holdExpiresAt: bookings.holdExpiresAt,
            createdAt: bookings.createdAt,
            bookingDate: bookings.bookingDate,
            startTime: bookings.startTime,
            endTime: bookings.endTime,
            pitchName: pitches.name,
        })
        .from(bookings)
        .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
        .where(and(eq(bookings.id, bookingId), eq(bookings.userId, user.id)))
        .limit(1);

    if (!b) return { ok: false, error: msg("bookingNotFound", "Booking not found.") };
    if (b.status === "confirmed") return { ok: false, error: msg("alreadyPaid", "This booking is already paid.") };
    if (b.status !== "held") return { ok: false, error: msg("cantPay", "This booking can't be paid any more. Pick the slot again.") };

    const now = Date.now();
    const expires = b.holdExpiresAt ? new Date(b.holdExpiresAt).getTime() : 0;
    if (expires <= now) {
        return { ok: false, expired: true, error: msg("holdExpired", "Your reservation ran out. Pick the slot again.") };
    }
    if (!(Number(b.totalPrice) > 0)) return { ok: false, error: msg("nothingToPay", "This booking has nothing to pay.") };

    const cap = new Date(b.createdAt).getTime() + MAX_HOLD_MINUTES * 60000;
    const stretched = Math.min(cap, now + HOLD_MINUTES * 60000);
    if (stretched > expires) {
        await db
            .update(bookings)
            .set({ holdExpiresAt: new Date(stretched), updatedAt: new Date() })
            .where(and(eq(bookings.id, b.id), eq(bookings.status, "held")));
    }

    const tranId = newTranId(b.code);
    const amount = String(b.totalPrice);
    await db.insert(payments).values({ bookingId: b.id, gateway, tranId, amount, currency: "BDT", status: "initiated" });

    const base = appUrl();

    if (gateway === "bkash") {
        const created = await bkashCreate({
            tranId,
            amount,
            payerReference: user.phone || b.code,
            callbackURL: `${base}/api/payment/bkash/callback`,
        });
        if (!created.ok) {
            await db
                .update(payments)
                .set({ status: "failed", raw: { error: created.error }, updatedAt: new Date() })
                .where(eq(payments.tranId, tranId));
            return { ok: false, error: i18n ? i18n.t("errors.gatewayInit") : created.error };
        }
        await db
            .update(payments)
            .set({ sessionKey: created.paymentId, updatedAt: new Date() })
            .where(eq(payments.tranId, tranId));
        return { ok: true, data: { url: created.url } };
    }

    const session = await initSession({
        tranId,
        amount,
        productName: `${b.pitchName}, ${shortDateLabel(b.bookingDate)}, ${time12(b.startTime)} to ${time12(b.endTime)}`,
        customer: { name: user.name, email: user.email, phone: user.phone },
        urls: {
            success: `${base}/api/payment/sslcommerz/success`,
            fail: `${base}/api/payment/sslcommerz/fail`,
            cancel: `${base}/api/payment/sslcommerz/cancel`,
            ipn: `${base}/api/payment/sslcommerz/ipn`,
        },
        valueA: b.id,
    });

    if (!session.ok) {
        await db
            .update(payments)
            .set({ status: "failed", raw: { error: session.error }, updatedAt: new Date() })
            .where(eq(payments.tranId, tranId));
        return { ok: false, error: i18n ? i18n.t("errors.gatewayInit") : session.error };
    }

    await db
        .update(payments)
        .set({ sessionKey: session.sessionKey, updatedAt: new Date() })
        .where(eq(payments.tranId, tranId));

    return { ok: true, data: { url: session.url } };
}

/* -------------------------------------------------------------- */
/* Confirm                                                         */
/* -------------------------------------------------------------- */

export async function confirmPayment({ tranId, valId }) {
    if (!tranId || !valId) return { ok: false, outcome: "invalid" };

    const [p] = await db.select().from(payments).where(eq(payments.tranId, tranId)).limit(1);
    if (!p) return { ok: false, outcome: "unknown" };
    if (p.gateway !== "sslcommerz") return { ok: false, outcome: "invalid", bookingId: p.bookingId };
    if (p.status === "paid") return ensureSettled(p);
    if (p.status === "refund_due" || p.status === "refunded") {
        return { ok: true, outcome: "duplicate", bookingId: p.bookingId };
    }

    const v = await validateOrder(valId);
    if (!v) return { ok: false, outcome: "pending", bookingId: p.bookingId };

    const valid =
        (v.status === "VALID" || v.status === "VALIDATED") &&
        v.tran_id === tranId &&
        (v.currency_type ?? "BDT") === "BDT" &&
        sameAmount(v.currency_amount ?? v.amount, p.amount);

    if (!valid) {
        console.error("[payment:invalid]", tranId, v.status, v.amount, v.currency_type);
        await db
            .update(payments)
            .set({ status: "failed", valId, raw: v, updatedAt: new Date() })
            .where(and(eq(payments.id, p.id), ne(payments.status, "paid")));
        return { ok: false, outcome: "invalid", bookingId: p.bookingId };
    }

    if (v.risk_level === "1" || v.risk_level === 1) {
        console.warn("[payment:risk]", tranId, v.risk_title);
    }

    return claimAndSettle(p, {
        valId,
        bankTranId: v.bank_tran_id ?? null,
        cardType: v.card_type ?? null,
        riskLevel: v.risk_level != null ? String(v.risk_level) : null,
        riskTitle: v.risk_title ?? null,
        raw: v,
    });
}

/* -------------------------------------------------------------- */
/* bKash                                                           */
/* -------------------------------------------------------------- */

/** A bKash execute/query answer we can trust as "paid" for this payment row. */
function bkashCompleted(r, p) {
    return (
        r?.transactionStatus === "Completed" &&
        Boolean(r.trxID) &&
        (!r.paymentID || r.paymentID === p.sessionKey) &&
        (!r.merchantInvoiceNumber || r.merchantInvoiceNumber === p.tranId) &&
        (r.currency ?? "BDT") === "BDT" &&
        sameAmount(r.amount, p.amount)
    );
}

function bkashPaidFields(r) {
    return { valId: r.paymentID ?? null, bankTranId: r.trxID, cardType: "BKASH", raw: r };
}

/**
 * The player came back from bKash with status=success. Execute the payment (this moves the money),
 * fall back to a status query if execute fails or times out, then confirm the booking once.
 * Outcomes as confirmPayment, plus "not_paid" when bKash says the payment didn't complete.
 */
export async function confirmBkashPayment(paymentId) {
    if (!paymentId || paymentId.length > 80) return { ok: false, outcome: "invalid" };

    const [p] = await db
        .select()
        .from(payments)
        .where(and(eq(payments.sessionKey, paymentId), eq(payments.gateway, "bkash")))
        .limit(1);
    if (!p) return { ok: false, outcome: "unknown" };
    if (p.status === "paid") return { ...(await ensureSettled(p)), tranId: p.tranId };
    if (p.status === "refund_due" || p.status === "refunded") {
        return { ok: true, outcome: "duplicate", bookingId: p.bookingId, tranId: p.tranId };
    }

    // bKash only takes the money on execute, so check the slot first: if it's gone, don't charge the player
    // at all (instead of charging and leaving a manual refund like a late SSLCommerz payment).
    if (!(await bookingStillPayable(p.bookingId))) {
        console.warn("[bkash:slot_gone_not_executed]", p.tranId);
        await db
            .update(payments)
            .set({ status: "failed", raw: { reason: "slot no longer available; payment not executed" }, updatedAt: new Date() })
            .where(and(eq(payments.id, p.id), eq(payments.status, "initiated")));
        return { ok: false, outcome: "not_paid", bookingId: p.bookingId, tranId: p.tranId };
    }

    let r = await bkashExecute(paymentId);
    if (!bkashCompleted(r, p)) {
        // Execute failed, timed out, or was already called (browser refresh, double tap): ask for the real state.
        const q = await bkashQuery(paymentId);
        if (!q) return { ok: false, outcome: "pending", bookingId: p.bookingId, tranId: p.tranId };
        const executeError = r?.statusCode && r.statusCode !== "0000" ? `${r.statusCode} ${r.statusMessage ?? ""}`.trim() : null;
        r = executeError ? { ...q, executeError } : q;
    }

    if (bkashCompleted(r, p)) {
        const out = await claimAndSettle(p, bkashPaidFields(r));
        return { ...out, tranId: p.tranId };
    }

    console.warn("[bkash:not_paid]", p.tranId, r?.transactionStatus, r?.statusCode, r?.statusMessage, r?.executeError);
    await db
        .update(payments)
        .set({ status: "failed", raw: r ?? null, updatedAt: new Date() })
        .where(and(eq(payments.id, p.id), eq(payments.status, "initiated")));
    return { ok: false, outcome: "not_paid", bookingId: p.bookingId, tranId: p.tranId };
}

/**
 * Can this booking still be confirmed by a payment? Held, or expired with nobody else holding/booking the slot.
 * (Same rule settleBooking applies afterwards; the unique slot index stays the final word.)
 */
async function bookingStillPayable(bookingId) {
    const [b] = await db
        .select({ status: bookings.status, pitchId: bookings.pitchId, date: bookings.bookingDate, start: bookings.startTime })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
    if (!b) return false;
    if (b.status === "held") return true;
    if (b.status !== "expired") return false;
    const [other] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
            and(
                eq(bookings.pitchId, b.pitchId),
                eq(bookings.bookingDate, b.date),
                eq(bookings.startTime, b.start),
                inArray(bookings.status, ["held", "confirmed"]),
                ne(bookings.id, bookingId)
            )
        )
        .limit(1);
    return !other;
}

/** Player cancelled or bKash failed it on their side: close the attempt (the slot stays held for a retry). */
export async function closeBkashPayment(paymentId, status, raw) {
    if (!paymentId || paymentId.length > 80) return null;
    const [p] = await db
        .select({ tranId: payments.tranId })
        .from(payments)
        .where(and(eq(payments.sessionKey, paymentId), eq(payments.gateway, "bkash")))
        .limit(1);
    if (!p) return null;
    await markPaymentClosed(p.tranId, status, raw);
    return p.tranId;
}

/** Cron / admin / success page: read-only status check. Never executes (a payment nobody executed took no money). */
async function recheckBkash(p) {
    if (!p.sessionKey) return { ok: false, outcome: "not_paid" };
    const q = await bkashQuery(p.sessionKey);
    if (!q) return { ok: false, outcome: "pending" };
    if (!bkashCompleted(q, p)) return { ok: false, outcome: "not_paid" };
    return claimAndSettle(p, bkashPaidFields(q));
}

/* -------------------------------------------------------------- */
/* Shared: claim the payment once, then settle the booking         */
/* -------------------------------------------------------------- */

/**
 * A payment is already marked paid. Normally its booking was confirmed at the same time, but if the server
 * crashed between the two steps the booking is still held/expired (or cancelled while unpaid). Finish that
 * settlement now. Waits until the claim is REPAIR_AFTER_MS old so it never races the request still settling it.
 */
const REPAIR_AFTER_MS = 2 * 60000;

async function ensureSettled(p) {
    const [b] = await db
        .select({ status: bookings.status, paymentStatus: bookings.paymentStatus })
        .from(bookings)
        .where(eq(bookings.id, p.bookingId))
        .limit(1);
    const unsettled = b && b.paymentStatus === "unpaid" && ["held", "expired", "cancelled", "confirmed"].includes(b.status);
    const old = p.updatedAt && Date.now() - new Date(p.updatedAt).getTime() > REPAIR_AFTER_MS;
    if (!unsettled) return { ok: true, outcome: "confirmed", bookingId: p.bookingId };
    if (!old) return { ok: false, outcome: "pending", bookingId: p.bookingId };
    console.warn("[payment:repair]", p.tranId, b.status);
    return settleBooking(p.id, p.bookingId);
}

/**
 * Cron: payments marked paid whose booking never got settled (crash between the two writes).
 * Returns how many were repaired.
 */
export async function repairUnsettledPayments(limit = 20) {
    const rows = await db
        .select({ id: payments.id, tranId: payments.tranId, bookingId: payments.bookingId, updatedAt: payments.updatedAt })
        .from(payments)
        .innerJoin(bookings, eq(payments.bookingId, bookings.id))
        .where(
            and(
                eq(payments.status, "paid"),
                eq(bookings.paymentStatus, "unpaid"),
                lt(payments.updatedAt, new Date(Date.now() - REPAIR_AFTER_MS))
            )
        )
        .limit(limit);
    let repaired = 0;
    for (const p of rows) {
        const r = await ensureSettled(p);
        if (r.ok) repaired++;
    }
    return repaired;
}

/**
 * Mark the payment paid only if nobody else did (browser + IPN/cron racing), then settle the booking.
 * fields: columns to store with the paid status (valId, bankTranId, cardType, risk..., raw).
 */
async function claimAndSettle(p, fields) {
    const claimed = await db
        .update(payments)
        .set({ ...fields, status: "paid", updatedAt: new Date() })
        .where(and(eq(payments.id, p.id), ne(payments.status, "paid")))
        .returning({ id: payments.id });
    if (claimed.length === 0) return { ok: true, outcome: "confirmed", bookingId: p.bookingId };
    return settleBooking(p.id, p.bookingId);
}

async function settleBooking(paymentId, bookingId) {
    const [b] = await db
        .select({ status: bookings.status, paymentStatus: bookings.paymentStatus })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

    if (b?.status === "confirmed" && b.paymentStatus === "paid") return duplicateOrConfirmed(paymentId, bookingId);
    if (b?.status === "confirmed") {
        await db.update(bookings).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
        return { ok: true, outcome: "confirmed", bookingId };
    }

    if (b && (b.status === "held" || b.status === "expired")) {
        try {
            const rows = await db
                .update(bookings)
                .set({ status: "confirmed", paymentStatus: "paid", holdExpiresAt: null, updatedAt: new Date() })
                .where(and(eq(bookings.id, bookingId), inArray(bookings.status, ["held", "expired"])))
                .returning({ id: bookings.id });
            if (rows.length) {
                await redeemCoupon(bookingId);
                waitUntil(
                    sendBookingReceiptByBookingId(bookingId).catch((err) =>
                        console.error("[ticket-email:after-pay]", err)
                    )
                );
                return { ok: true, outcome: "confirmed", bookingId };
            }
        } catch (err) {
            if (!isUniqueViolation(err)) throw err;
        }
        // Lost the update: someone confirmed it in the meantime (a concurrent settle of this or another payment)?
        const [now] = await db
            .select({ status: bookings.status, paymentStatus: bookings.paymentStatus })
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .limit(1);
        if (now?.status === "confirmed" && now.paymentStatus === "paid") return duplicateOrConfirmed(paymentId, bookingId);
    }

    await db
        .update(bookings)
        .set({
            status: "cancelled",
            paymentStatus: "refund_due",
            cancelledAt: new Date(),
            cancelReason: "Paid after the slot was released; refund due",
            updatedAt: new Date(),
        })
        .where(and(eq(bookings.id, bookingId), ne(bookings.status, "confirmed")));
    console.warn("[payment:slot_lost]", bookingId);
    return { ok: true, outcome: "slot_lost", bookingId };
}

/**
 * The booking is already confirmed and paid. If another payment row is what paid it, this one is a
 * double payment (refund due); if this is the only paid row, it was this payment and all is well.
 */
async function duplicateOrConfirmed(paymentId, bookingId) {
    const [other] = await db
        .select({ id: payments.id })
        .from(payments)
        .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "paid"), ne(payments.id, paymentId)))
        .limit(1);
    if (!other) return { ok: true, outcome: "confirmed", bookingId };
    await db.update(payments).set({ status: "refund_due", updatedAt: new Date() }).where(eq(payments.id, paymentId));
    return { ok: true, outcome: "duplicate", bookingId };
}

/* -------------------------------------------------------------- */
/* Lost callbacks                                                  */
/* -------------------------------------------------------------- */

/** Ask the payment's own gateway whether it was paid; confirm the booking if so. */
export async function recheckPayment(tranId) {
    const [p] = await db.select().from(payments).where(eq(payments.tranId, tranId)).limit(1);
    if (!p) return { ok: false, outcome: "unknown" };
    if (!isGatewayConfigured(p.gateway)) return { ok: false, outcome: "pending" };
    if (p.gateway === "bkash") return recheckBkash(p);

    const q = await queryTransaction(tranId);
    if (!q) return { ok: false, outcome: "pending" };
    const paid = q.element.find((e) => (e.status === "VALID" || e.status === "VALIDATED") && e.val_id);
    if (!paid) return { ok: false, outcome: "not_paid" };
    return confirmPayment({ tranId, valId: paid.val_id });
}

export async function recheckOpenPayments(limit = 20) {
    const now = Date.now();
    const open = await db
        .select({ tranId: payments.tranId, gateway: payments.gateway })
        .from(payments)
        .where(
            and(
                inArray(payments.status, ["initiated", "failed", "cancelled"]),
                lt(payments.createdAt, new Date(now - 5 * 60000)),
                gt(payments.createdAt, new Date(now - 120 * 60000))
            )
        )
        .limit(limit);

    let confirmed = 0;
    for (const p of open) {
        if (!isGatewayConfigured(p.gateway)) continue;
        const r = await recheckPayment(p.tranId);
        if (r.ok && r.outcome === "confirmed") confirmed++;
    }
    return { checked: open.length, confirmed };
}

/* -------------------------------------------------------------- */
/* Fail / cancel                                                   */
/* -------------------------------------------------------------- */

export async function markPaymentClosed(tranId, status, raw) {
    if (!tranId) return;
    await db
        .update(payments)
        .set({ status, raw: raw ?? null, updatedAt: new Date() })
        .where(and(eq(payments.tranId, tranId), eq(payments.status, "initiated")));
}

/* -------------------------------------------------------------- */
/* Result pages                                                    */
/* -------------------------------------------------------------- */

export async function getPaymentResult(tranId) {
    if (!tranId || tranId.length > 40) return null;
    const [r] = await db
        .select({
            paymentStatus: payments.status,
            gateway: payments.gateway,
            amount: payments.amount,
            cardType: payments.cardType,
            bankTranId: payments.bankTranId,
            bookingId: bookings.id,
            pitchId: bookings.pitchId,
            code: bookings.code,
            status: bookings.status,
            bookingPayment: bookings.paymentStatus,
            holdExpiresAt: bookings.holdExpiresAt,
            date: bookings.bookingDate,
            start: bookings.startTime,
            end: bookings.endTime,
            total: bookings.totalPrice,
            pitch: pitches.name,
        })
        .from(payments)
        .innerJoin(bookings, eq(payments.bookingId, bookings.id))
        .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
        .where(eq(payments.tranId, tranId))
        .limit(1);
    if (!r) return null;

    const dayStart = (await getSheetDayStarts([{ pitchId: r.pitchId, date: r.date }])).get(`${r.pitchId}|${r.date}`);
    const now = Date.now();
    const holdLeft =
        r.status === "held" && r.holdExpiresAt ? Math.ceil((new Date(r.holdExpiresAt).getTime() - now) / 60000) : 0;

    return {
        tranId,
        gateway: r.gateway,
        paymentStatus: r.paymentStatus,
        bookingStatus: r.status,
        refundDue: r.bookingPayment === "refund_due" || r.paymentStatus === "refund_due",
        canRetry: r.status === "held" && holdLeft > 0,
        booking: {
            id: r.code,
            bookingId: r.bookingId,
            pitch: r.pitch,
            date: r.date,
            start: r.start,
            end: r.end,
            dayStart,
            total: Number(r.total),
            paidWith: r.cardType,
            trxId: r.bankTranId,
            holdMinutesLeft: Math.max(0, holdLeft),
        },
    };
}