// src/features/admin/commerce-queries.js
// Admin reads for Coupons, Payments and Users (server only, uncached).
import "server-only";
import { and, asc, count, desc, eq, gt, ilike, inArray, isNull, or, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { bookings, couponRedemptions, coupons, payments, pitches, promoBanners, user } from "@/db/schema";
import { discountLabel, timeWindowLabel } from "@/features/coupons/rules";
import { prettyMethod } from "@/lib/sslcommerz";
import { dayStartOf, DEFAULT_DAY_START, dhakaDate, dhakaTime, shortDateLabel } from "@/lib/time";
import { defaultSheet } from "@/features/booking/queries";
import { time12 } from "@/lib/utils";

export const PAYMENTS_PAGE_SIZE = 25;

/** Date -> "14 Oct, 8:52 pm" (Dhaka). */
function stamp(d) {
    if (!d) return "";
    const dt = new Date(d);
    return `${shortDateLabel(dhakaDate(dt)).replace(/^\w+ /, "")}, ${time12(dhakaTime(dt))}`;
}

/** Stored endsAt is the midnight after the last day -> "YYYY-MM-DD" of the last day. */
const lastDay = (endsAt) => (endsAt ? dhakaDate(new Date(new Date(endsAt).getTime() - 1)) : "");

/* -------------------------------------------------------------- */
/* Coupons                                                         */
/* -------------------------------------------------------------- */

export function couponStatus(c, now = Date.now()) {
    if (!c.isActive) return "hidden";
    if (c.startsAt && new Date(c.startsAt).getTime() > now) return "scheduled";
    if (c.endsAt && new Date(c.endsAt).getTime() <= now) return "ended";
    if (c.usageLimit != null && c.usedCount >= c.usageLimit) return "used_up";
    return "active";
}

export async function getCouponsAdmin() {
    const now = new Date();
    const [rows, given, holds, banners, grounds] = await Promise.all([
        db.select().from(coupons).orderBy(desc(coupons.createdAt)),
        db
            .select({ couponId: couponRedemptions.couponId, total: sum(couponRedemptions.amount) })
            .from(couponRedemptions)
            .groupBy(couponRedemptions.couponId),
        db
            .select({ couponId: bookings.couponId, n: count() })
            .from(bookings)
            .where(and(eq(bookings.status, "held"), or(isNull(bookings.holdExpiresAt), gt(bookings.holdExpiresAt, now))))
            .groupBy(bookings.couponId),
        db.select({ couponId: promoBanners.couponId, title: promoBanners.title }).from(promoBanners),
        db
            .select({ id: pitches.id, name: pitches.name, isActive: pitches.isActive, defaultBlocks: pitches.defaultBlocks })
            .from(pitches)
            .orderBy(asc(pitches.sortOrder), asc(pitches.name)),
    ]);
    const givenBy = new Map(given.map((g) => [g.couponId, Number(g.total ?? 0)]));
    const holdsBy = new Map(holds.map((h) => [h.couponId, Number(h.n)]));
    const nowMs = now.getTime();

    return {
        coupons: rows.map((c) => {
            const tw = c.timeWindow && typeof c.timeWindow === "object" ? c.timeWindow : {};
            return {
                id: c.id,
                code: c.code,
                type: c.type,
                value: Number(c.value),
                maxDiscount: c.maxDiscount != null ? Number(c.maxDiscount) : null,
                minAmount: c.minAmount != null ? Number(c.minAmount) : null,
                usageLimit: c.usageLimit,
                perUserLimit: c.perUserLimit,
                usedCount: c.usedCount,
                heldNow: holdsBy.get(c.id) ?? 0,
                discountGiven: givenBy.get(c.id) ?? 0,
                pitchIds: Array.isArray(c.pitchIds) ? c.pitchIds : [],
                days: Array.isArray(tw.days) ? tw.days : [],
                from: tw.from ?? "",
                to: tw.to ?? "",
                startDate: c.startsAt ? dhakaDate(new Date(c.startsAt)) : "",
                endDate: lastDay(c.endsAt),
                isActive: c.isActive,
                status: couponStatus(c, nowMs),
                label: discountLabel(c),
                whenLabel: timeWindowLabel(tw),
                banners: banners.filter((b) => b.couponId === c.id).map((b) => b.title),
            };
        }),
        grounds: grounds.map((g) => ({ id: g.id, name: g.name })),
        // Earliest first slot of the open grounds: the coupon hour picker starts here.
        dayStart: Math.min(...grounds.filter((g) => g.isActive).map((g) => dayStartOf(defaultSheet(g))), DEFAULT_DAY_START),
    };
}

/* -------------------------------------------------------------- */
/* Payments                                                        */
/* -------------------------------------------------------------- */

/** Display status: the booking can be refund_due while its payment row still says paid (slot lost). */
function paymentView(r) {
    let status = r.status;
    if (status === "paid" && r.bookingPayment === "refund_due") status = "refund_due";
    if (status === "paid" && r.bookingPayment === "refunded") status = "refunded";
    return {
        id: r.id,
        tranId: r.tranId,
        bookingId: r.bookingId,
        bookingCode: r.bookingCode,
        bookingStatus: r.bookingStatus,
        slot: `${r.pitchName}, ${shortDateLabel(r.bookingDate)}, ${time12(r.startTime)}`,
        customer: r.userName ?? r.customerName ?? "",
        phone: r.customerPhone ?? "",
        amount: Number(r.amount),
        method: r.cardType ? prettyMethod(r.cardType) : "",
        bankTranId: r.bankTranId ?? "",
        status,
        risky: r.riskLevel === "1",
        riskTitle: r.riskTitle ?? "",
        at: stamp(r.createdAt),
    };
}

const STATUS_FILTERS = {
    paid: (p) => and(eq(p.status, "paid"), eq(bookings.paymentStatus, "paid")),
    started: (p) => eq(p.status, "initiated"),
    failed: (p) => inArray(p.status, ["failed", "cancelled"]),
    refund_due: (p) => or(eq(p.status, "refund_due"), and(eq(p.status, "paid"), eq(bookings.paymentStatus, "refund_due"))),
    refunded: (p) => eq(p.status, "refunded"),
    risky: (p) => and(eq(p.status, "paid"), eq(p.riskLevel, "1")),
};

/**
 * Payments, newest first. filters: { q, status: keyof STATUS_FILTERS | "", page }
 * Returns { rows, total, page, pageCount, counts: { refundDue, risky, started } }.
 */
export async function getPaymentsAdmin({ q = "", status = "", page = 1 } = {}) {
    const where = [];
    if (STATUS_FILTERS[status]) where.push(STATUS_FILTERS[status](payments));
    const term = q.trim();
    if (term) {
        const like = `%${term}%`;
        where.push(
            or(
                ilike(payments.tranId, like),
                ilike(payments.bankTranId, like),
                ilike(bookings.code, like),
                ilike(bookings.customerName, like),
                ilike(bookings.customerPhone, like),
                ilike(user.name, like),
                ilike(user.email, like)
            )
        );
    }
    const whereSql = where.length ? and(...where) : undefined;

    const [[{ n }], rows, [counts]] = await Promise.all([
        db
            .select({ n: count() })
            .from(payments)
            .innerJoin(bookings, eq(payments.bookingId, bookings.id))
            .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
            .leftJoin(user, eq(bookings.userId, user.id))
            .where(whereSql),
        db
            .select({
                id: payments.id,
                tranId: payments.tranId,
                amount: payments.amount,
                status: payments.status,
                cardType: payments.cardType,
                bankTranId: payments.bankTranId,
                riskLevel: payments.riskLevel,
                riskTitle: payments.riskTitle,
                createdAt: payments.createdAt,
                bookingId: bookings.id,
                bookingCode: bookings.code,
                bookingStatus: bookings.status,
                bookingPayment: bookings.paymentStatus,
                bookingDate: bookings.bookingDate,
                startTime: bookings.startTime,
                customerName: bookings.customerName,
                customerPhone: bookings.customerPhone,
                pitchName: pitches.name,
                userName: user.name,
            })
            .from(payments)
            .innerJoin(bookings, eq(payments.bookingId, bookings.id))
            .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
            .leftJoin(user, eq(bookings.userId, user.id))
            .where(whereSql)
            .orderBy(desc(payments.createdAt))
            .limit(PAYMENTS_PAGE_SIZE)
            .offset((Math.max(1, page) - 1) * PAYMENTS_PAGE_SIZE),
        db
            .select({
                refundDue: sql`count(*) filter (where ${payments.status} = 'refund_due' or (${payments.status} = 'paid' and ${bookings.paymentStatus} = 'refund_due'))`,
                risky: sql`count(*) filter (where ${payments.status} = 'paid' and ${payments.riskLevel} = '1')`,
                started: sql`count(*) filter (where ${payments.status} = 'initiated')`,
            })
            .from(payments)
            .innerJoin(bookings, eq(payments.bookingId, bookings.id)),
    ]);
    const total = Number(n);
    return {
        rows: rows.map(paymentView),
        total,
        page: Math.max(1, page),
        pageCount: Math.max(1, Math.ceil(total / PAYMENTS_PAGE_SIZE)),
        counts: { refundDue: Number(counts?.refundDue ?? 0), risky: Number(counts?.risky ?? 0), started: Number(counts?.started ?? 0) },
    };
}

/* -------------------------------------------------------------- */
/* Users                                                           */
/* -------------------------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Users with how many bookings they made (not counting cancelled or expired). */
export async function getUsersAdmin({ q = "" } = {}) {
    const term = q.trim();
    const where = term
        ? or(ilike(user.name, `%${term}%`), ilike(user.email, `%${term}%`), ilike(user.phone, `%${term}%`))
        : undefined;

    const [rows, counts, admins] = await Promise.all([
        db
            .select({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, image: user.image, createdAt: user.createdAt })
            .from(user)
            .where(where)
            .orderBy(sql`case ${user.role} when 'admin' then 0 when 'editor' then 1 else 2 end`, desc(user.createdAt))
            .limit(300),
        db
            .select({ userId: bookings.userId, n: count() })
            .from(bookings)
            .where(inArray(bookings.status, ["held", "confirmed", "completed"]))
            .groupBy(bookings.userId),
        db.select({ n: count() }).from(user).where(eq(user.role, "admin")),
    ]);
    const byUser = new Map(counts.map((c) => [c.userId, Number(c.n)]));

    return {
        users: rows.map((u) => {
            const d = new Date(u.createdAt);
            const [y, m] = dhakaDate(d).split("-").map(Number);
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone ?? "",
                role: u.role ?? "user",
                image: u.image ?? null,
                bookings: byUser.get(u.id) ?? 0,
                joined: `${MONTHS[m - 1]} ${y}`,
            };
        }),
        adminCount: Number(admins[0]?.n ?? 0),
    };
}