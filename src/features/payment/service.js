// src/features/payment/service.js
// Payment flow (server only). Called by the payment action, the SSLCommerz
// callbacks/IPN route, the result pages and the cron job.
//
//   startPayment      held booking -> payments row (initiated) -> SSLCommerz session URL
//   confirmPayment    val_id -> Validation API -> payment paid -> booking confirmed (idempotent)
//   recheckPayment    tran_id -> Transaction Query API -> confirmPayment (lost callbacks)
//   markPaymentClosed fail/cancel callbacks: initiated -> failed | cancelled (booking stays held)
//
// Safety rules:
// - The only proof of payment is SSLCommerz's Validation API; callback form fields are never trusted.
// - The payment row is "claimed" with a conditional UPDATE (status <> 'paid'), so the browser
//   callback, the IPN and the cron can all run at once and the booking is confirmed only once.
// - If the slot was lost while the player was paying (hold expired and someone else booked it,
//   or the booking was cancelled), the money is kept as refund_due instead of double-booking.
import "server-only";
import { and, eq, inArray, lt, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, pitches } from "@/db/schema";
import { initSession, queryTransaction, validateOrder } from "@/lib/sslcommerz";
import { HOLD_MINUTES } from "@/features/booking/queries";
import { shortDateLabel } from "@/lib/time";
import { time12 } from "@/lib/utils";

// A hold can be stretched while the player is on the payment page, but never past this.
const MAX_HOLD_MINUTES = 30;

function appUrl() {
    return (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** "TZ-8F2K1-LX3K9A": booking code + attempt suffix. Unique per attempt, max 30 chars. */
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
 * Open a payment for a held booking that belongs to `user`.
 * Returns { ok: true, data: { url } } or { ok: false, error, expired? }.
 */
export async function startPayment(bookingId, user) {
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

    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status === "confirmed") return { ok: false, error: "This booking is already paid." };
    if (b.status !== "held") return { ok: false, error: "This booking can't be paid any more. Pick the slot again." };

    const now = Date.now();
    const expires = b.holdExpiresAt ? new Date(b.holdExpiresAt).getTime() : 0;
    if (expires <= now) {
        return { ok: false, expired: true, error: "Your reservation ran out. Pick the slot again." };
    }
    if (!(Number(b.totalPrice) > 0)) return { ok: false, error: "This booking has nothing to pay." };

    // Give the player time on the gateway page, capped at MAX_HOLD_MINUTES from the original hold.
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
    await db.insert(payments).values({ bookingId: b.id, tranId, amount, currency: "BDT", status: "initiated" });

    const base = appUrl();
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
        return { ok: false, error: session.error };
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

/**
 * Validate a payment with SSLCommerz and confirm its booking. Safe to call many times.
 * Returns { ok, outcome, bookingId? }:
 *   outcome "confirmed"  booking confirmed (now or earlier)
 *           "slot_lost"  paid, but the slot was gone: booking cancelled, refund due
 *           "duplicate"  booking was already paid by another attempt: this payment is refund due
 *           "invalid"    SSLCommerz says it isn't a valid payment
 *           "pending"    couldn't reach SSLCommerz; try again later (IPN/cron will finish it)
 *           "unknown"    no such tran_id
 */
export async function confirmPayment({ tranId, valId }) {
    if (!tranId || !valId) return { ok: false, outcome: "invalid" };

    const [p] = await db.select().from(payments).where(eq(payments.tranId, tranId)).limit(1);
    if (!p) return { ok: false, outcome: "unknown" };
    if (p.status === "paid") return { ok: true, outcome: "confirmed", bookingId: p.bookingId };
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

    // Claim the payment. Only one caller gets a row back; the others stop here.
    const claimed = await db
        .update(payments)
        .set({
            status: "paid",
            valId,
            bankTranId: v.bank_tran_id ?? null,
            cardType: v.card_type ?? null,
            riskLevel: v.risk_level != null ? String(v.risk_level) : null,
            riskTitle: v.risk_title ?? null,
            raw: v,
            updatedAt: new Date(),
        })
        .where(and(eq(payments.id, p.id), ne(payments.status, "paid")))
        .returning({ id: payments.id });
    if (claimed.length === 0) return { ok: true, outcome: "confirmed", bookingId: p.bookingId };

    if (v.risk_level === "1" || v.risk_level === 1) {
        console.warn("[payment:risk]", tranId, v.risk_title); // shown to the admin in Step 6
    }

    return settleBooking(p.id, p.bookingId);
}

/** After a payment is claimed as paid: confirm the booking, or record a refund if that's impossible. */
async function settleBooking(paymentId, bookingId) {
    const [b] = await db
        .select({ status: bookings.status, paymentStatus: bookings.paymentStatus })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

    // Already paid through another attempt (player paid twice): refund this one.
    if (b?.status === "confirmed" && b.paymentStatus === "paid") {
        await db.update(payments).set({ status: "refund_due", updatedAt: new Date() }).where(eq(payments.id, paymentId));
        return { ok: true, outcome: "duplicate", bookingId };
    }
    if (b?.status === "confirmed") {
        await db.update(bookings).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
        return { ok: true, outcome: "confirmed", bookingId };
    }

    if (b && (b.status === "held" || b.status === "expired")) {
        try {
            // An expired hold is revived if nobody took the slot meanwhile; the unique index decides.
            const rows = await db
                .update(bookings)
                .set({ status: "confirmed", paymentStatus: "paid", holdExpiresAt: null, updatedAt: new Date() })
                .where(and(eq(bookings.id, bookingId), inArray(bookings.status, ["held", "expired"])))
                .returning({ id: bookings.id });
            if (rows.length) return { ok: true, outcome: "confirmed", bookingId };
        } catch (err) {
            if (!isUniqueViolation(err)) throw err;
        }
    }

    // Slot gone (taken by someone else, or the booking was cancelled): keep the money as a refund.
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

/* -------------------------------------------------------------- */
/* Lost callbacks                                                  */
/* -------------------------------------------------------------- */

/**
 * Ask SSLCommerz about a payment we never heard back on. If it was paid, confirm it.
 * Returns the same shape as confirmPayment, or { ok: false, outcome: "not_paid" | "pending" }.
 */
export async function recheckPayment(tranId) {
    const q = await queryTransaction(tranId);
    if (!q) return { ok: false, outcome: "pending" };
    const paid = q.element.find((e) => (e.status === "VALID" || e.status === "VALIDATED") && e.val_id);
    if (!paid) return { ok: false, outcome: "not_paid" };
    return confirmPayment({ tranId, valId: paid.val_id });
}

/**
 * Re-check payments that were opened 5 to 120 minutes ago and never finished.
 * Run by the cron job. Returns how many were confirmed.
 */
export async function recheckOpenPayments(limit = 20) {
    const now = Date.now();
    const open = await db
        .select({ tranId: payments.tranId })
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
        const r = await recheckPayment(p.tranId);
        if (r.ok && r.outcome === "confirmed") confirmed++;
    }
    return { checked: open.length, confirmed };
}

/* -------------------------------------------------------------- */
/* Fail / cancel                                                   */
/* -------------------------------------------------------------- */

/**
 * Fail or cancel callback. Only touches a payment that is still "initiated";
 * a later valid payment for the same tran_id still wins in confirmPayment.
 * The booking stays held, so the player can try again until the hold runs out.
 */
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

/** Everything the /payment/* pages show for a tran_id (no personal details). */
export async function getPaymentResult(tranId) {
    if (!tranId || tranId.length > 40) return null;
    const [r] = await db
        .select({
            paymentStatus: payments.status,
            amount: payments.amount,
            cardType: payments.cardType,
            bankTranId: payments.bankTranId,
            bookingId: bookings.id,
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

    const now = Date.now();
    const holdLeft =
        r.status === "held" && r.holdExpiresAt ? Math.ceil((new Date(r.holdExpiresAt).getTime() - now) / 60000) : 0;

    return {
        tranId,
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
            total: Number(r.total),
            paidWith: r.cardType,
            trxId: r.bankTranId,
            holdMinutesLeft: Math.max(0, holdLeft),
        },
    };
}