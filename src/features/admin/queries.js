// src/features/admin/queries.js
// Server-side reads for the admin area (dashboard, bookings, grounds, slot editor).
// Ported from the prototype's src/app/actions/admin.js and adapted to the new schema.
import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { bookings, pitches, timeBlocks, user, heroSlides, coupons } from "@/db/schema";
import { addDaysISO, currentOperatingDay, dhakaTime, isBlockPast, shortDateLabel } from "@/lib/time";
import { getTimeBlocksForPitch } from "@/features/booking/queries";
import { time12 } from "@/lib/utils";

export const EDITOR_DAYS = 30; // slot editor shows today + next 29 days
const PAGE_SIZE = 25;

const activeNow = () =>
    or(
        eq(bookings.status, "confirmed"),
        and(eq(bookings.status, "held"), or(isNull(bookings.holdExpiresAt), gt(bookings.holdExpiresAt, new Date())))
    );

/* -------------------------------------------------------------- */
/* Sidebar badge                                                   */
/* -------------------------------------------------------------- */

/** Number of bookings waiting for payment right now. */
export async function countActiveHolds() {
    const [row] = await db
        .select({ c: sql`count(*)` })
        .from(bookings)
        .where(and(eq(bookings.status, "held"), gt(bookings.holdExpiresAt, new Date())));
    return Number(row?.c ?? 0);
}

/* -------------------------------------------------------------- */
/* Dashboard                                                       */
/* -------------------------------------------------------------- */

export async function getDashboardStats() {
    const { date: today } = currentOperatingDay();
    const monthStart = today.slice(0, 8) + "01";

    // Same period last month, e.g. 1–13 Sep when today is 13 Oct.
    const [y, m, d] = today.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1));
    const prevStart = prev.toISOString().slice(0, 10);
    const prevDays = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0)).getUTCDate();
    const prevEnd = `${prevStart.slice(0, 8)}${String(Math.min(d, prevDays)).padStart(2, "0")}`;

    const sumWhere = (from, to) =>
        db
            .select({
                count: sql`count(*)`,
                revenue: sql`coalesce(sum(${bookings.totalPrice}), 0)`,
            })
            .from(bookings)
            .where(and(gte(bookings.bookingDate, from), lte(bookings.bookingDate, to), eq(bookings.status, "confirmed")));

    const [todayActive, todayConfirmed, month, lastMonth, holds] = await Promise.all([
        db.select({ c: sql`count(*)` }).from(bookings).where(and(eq(bookings.bookingDate, today), activeNow())),
        sumWhere(today, today),
        sumWhere(monthStart, today),
        sumWhere(prevStart, prevEnd),
        countActiveHolds(),
    ]);

    const monthRevenue = Number(month[0]?.revenue ?? 0);
    const lastMonthRevenue = Number(lastMonth[0]?.revenue ?? 0);
    const monthChange = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : null;

    return {
        today,
        todayBookings: Number(todayActive[0]?.c ?? 0),
        todayRevenue: Number(todayConfirmed[0]?.revenue ?? 0),
        monthRevenue,
        monthChange,
        pendingHolds: holds,
    };
}

/**
 * Today's timeline for TonightBoard:
 * rows [{ pitch, blocks: [{ start, end, status: confirmed|held|free|past, who }] }]
 * plus occupancy % and the time range to draw.
 */
export async function getTodayBoard() {
    const { date: today } = currentOperatingDay();
    const active = await db.select().from(pitches).where(eq(pitches.isActive, true)).orderBy(asc(pitches.sortOrder), asc(pitches.name));
    if (active.length === 0) return { rows: [], occupancy: 0, freeCount: 0, from: null, to: null, now: dhakaTime(), date: today };

    const taken = await db
        .select({
            pitchId: bookings.pitchId,
            startTime: bookings.startTime,
            status: bookings.status,
            customerName: bookings.customerName,
            userName: user.name,
        })
        .from(bookings)
        .leftJoin(user, eq(bookings.userId, user.id))
        .where(and(eq(bookings.bookingDate, today), inArray(bookings.pitchId, active.map((p) => p.id)), activeNow()));

    const takenMap = new Map(taken.map((t) => [`${t.pitchId}|${t.startTime}`, t]));

    let total = 0;
    let used = 0;
    let freeCount = 0;
    let minStart = null;
    let maxEnd = null;
    const opMin = (hhmm) => {
        const [h, mm] = hhmm.split(":").map(Number);
        return (h < 6 ? h + 24 : h) * 60 + mm;
    };

    const rows = [];
    for (const p of active) {
        const blocks = await getTimeBlocksForPitch(p, today);
        rows.push({
            pitch: p.name,
            blocks: blocks.map((b) => {
                total += 1;
                const t = takenMap.get(`${p.id}|${b.startTime}`);
                const past = isBlockPast(today, b.startTime);
                let status = "free";
                if (t?.status === "confirmed") status = "confirmed";
                else if (t?.status === "held") status = "held";
                else if (past) status = "past";
                if (t) used += 1;
                if (status === "free") freeCount += 1;
                if (minStart === null || opMin(b.startTime) < opMin(minStart)) minStart = b.startTime;
                if (maxEnd === null || opMin(b.endTime) > opMin(maxEnd)) maxEnd = b.endTime;
                return { start: b.startTime, end: b.endTime, status, who: t ? t.customerName || t.userName || "Walk-in" : null };
            }),
        });
    }

    return {
        rows,
        occupancy: total ? Math.round((used / total) * 100) : 0,
        freeCount,
        from: minStart,
        to: maxEnd,
        now: dhakaTime(),
        date: today,
    };
}

/** Latest bookings for the dashboard list. */
export async function getLatestBookings(limit = 5) {
    const rows = await baseBookingQuery().orderBy(desc(bookings.createdAt)).limit(limit);
    return rows.map(toAdminBookingRow);
}

/** Live hero slides and coupons for the "Live on the website" panel. */
export async function getLiveContentSummary() {
    const [slides, codes] = await Promise.all([
        db
            .select({ id: heroSlides.id, imageUrl: heroSlides.imageUrl, heading: heroSlides.heading })
            .from(heroSlides)
            .where(eq(heroSlides.isActive, true))
            .orderBy(asc(heroSlides.sortOrder))
            .limit(3),
        db
            .select({ code: coupons.code, usedCount: coupons.usedCount, isActive: coupons.isActive })
            .from(coupons)
            .orderBy(desc(coupons.createdAt))
            .limit(3),
    ]);
    return { slides, coupons: codes };
}

/* -------------------------------------------------------------- */
/* Bookings list                                                   */
/* -------------------------------------------------------------- */

function baseBookingQuery() {
    return db
        .select({
            id: bookings.id,
            code: bookings.code,
            bookingDate: bookings.bookingDate,
            startTime: bookings.startTime,
            endTime: bookings.endTime,
            totalPrice: bookings.totalPrice,
            status: bookings.status,
            paymentStatus: bookings.paymentStatus,
            source: bookings.source,
            holdExpiresAt: bookings.holdExpiresAt,
            customerName: bookings.customerName,
            customerPhone: bookings.customerPhone,
            createdAt: bookings.createdAt,
            pitchId: bookings.pitchId,
            pitchName: pitches.name,
            openHour: pitches.openHour,
            userName: user.name,
            userEmail: user.email,
            userPhone: user.phone,
        })
        .from(bookings)
        .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
        .leftJoin(user, eq(bookings.userId, user.id));
}

function relativeTime(date) {
    if (!date) return "";
    const diff = Math.max(0, Date.now() - date.getTime());
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const days = Math.floor(hr / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
}

/** Status shown in admin: refund_due wins; expired holds and played bookings are derived. */
function displayStatus(r) {
    if (r.paymentStatus === "refund_due") return "refund_due";
    if (r.status === "held" && r.holdExpiresAt && r.holdExpiresAt.getTime() <= Date.now()) return "expired";
    if (r.status === "confirmed" && isBlockPast(r.bookingDate, r.startTime)) return "completed";
    return r.status;
}

function toAdminBookingRow(r) {
    return {
        id: r.code,
        bookingId: r.id,
        customer: r.customerName || r.userName || "Walk-in",
        phone: r.customerPhone || r.userPhone || "",
        email: r.userEmail || "",
        pitch: r.pitchName,
        date: shortDateLabel(r.bookingDate),
        isoDate: r.bookingDate,
        time: `${time12(r.startTime)} to ${time12(r.endTime)}`,
        amount: Number(r.totalPrice),
        status: displayStatus(r),
        rawStatus: r.status,
        method:
            r.source === "walk_in"
                ? r.paymentStatus === "paid"
                    ? "Paid at venue"
                    : "Pay at venue"
                : ["paid", "refund_due", "refunded"].includes(r.paymentStatus)
                    ? "Online"
                    : null,
        source: r.source,
        created: relativeTime(r.createdAt),
    };
}

/**
 * Filtered, paginated bookings for /admin/bookings.
 * filters: { q, pitchId, status, range: "today" | "upcoming" | "week" | "all", page }
 */
export async function getAdminBookings({ q = "", pitchId = "", status = "", range = "upcoming", page = 1 } = {}) {
    const { date: today } = currentOperatingDay();
    const where = [];

    if (range === "today") where.push(eq(bookings.bookingDate, today));
    else if (range === "upcoming") where.push(gte(bookings.bookingDate, today));
    else if (range === "week") where.push(and(gte(bookings.bookingDate, addDaysISO(today, -6)), lte(bookings.bookingDate, today)));

    if (pitchId) where.push(eq(bookings.pitchId, pitchId));

    if (status === "refund_due") where.push(eq(bookings.paymentStatus, "refund_due"));
    else if (status === "held") where.push(and(eq(bookings.status, "held"), gt(bookings.holdExpiresAt, new Date())));
    else if (status === "expired")
        where.push(or(eq(bookings.status, "expired"), and(eq(bookings.status, "held"), lte(bookings.holdExpiresAt, new Date()))));
    else if (status) where.push(eq(bookings.status, status));

    const term = q.trim();
    if (term) {
        const like = `%${term}%`;
        where.push(
            or(
                ilike(bookings.code, like),
                ilike(bookings.customerName, like),
                ilike(bookings.customerPhone, like),
                ilike(user.email, like),
                ilike(user.name, like)
            )
        );
    }

    const cond = where.length ? and(...where) : undefined;
    const safePage = Math.max(1, Number(page) || 1);

    const [rows, countRows] = await Promise.all([
        baseBookingQuery()
            .where(cond)
            .orderBy(range === "upcoming" ? asc(bookings.bookingDate) : desc(bookings.bookingDate), asc(bookings.startTime))
            .limit(PAGE_SIZE)
            .offset((safePage - 1) * PAGE_SIZE),
        db
            .select({ c: sql`count(*)` })
            .from(bookings)
            .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
            .leftJoin(user, eq(bookings.userId, user.id))
            .where(cond),
    ]);

    const total = Number(countRows[0]?.c ?? 0);
    return {
        rows: rows.map(toAdminBookingRow),
        total,
        page: safePage,
        pageSize: PAGE_SIZE,
        pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
}

/* -------------------------------------------------------------- */
/* Grounds                                                         */
/* -------------------------------------------------------------- */

export async function getAllPitchesAdmin() {
    const rows = await db.select().from(pitches).orderBy(asc(pitches.sortOrder), asc(pitches.createdAt));
    return rows.map(toPitchAdmin);
}

export async function getPitchAdmin(pitchId) {
    const [row] = await db.select().from(pitches).where(eq(pitches.id, pitchId)).limit(1);
    return row ? toPitchAdmin(row) : null;
}

function toPitchAdmin(p) {
    const blocks = Array.isArray(p.defaultBlocks) ? p.defaultBlocks : [];
    return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description ?? "",
        sport: p.sport,
        format: p.format ?? "",
        size: p.size ?? "",
        surface: p.surface ?? "",
        hourlyRate: Number(p.hourlyRate),
        openHour: p.openHour,
        closeHour: p.closeHour,
        defaultSlotMinutes: p.defaultSlotMinutes,
        imageUrl: p.imageUrl ?? "",
        sortOrder: p.sortOrder,
        isActive: p.isActive,
        blockCount: blocks.length,
        firstStart: blocks[0]?.startTime ?? null,
        lastEnd: blocks[blocks.length - 1]?.endTime ?? null,
    };
}

/**
 * Slot editor data (same shape as the prototype's getPitchBlocksEditorData):
 * { pitch, defaultBlocks, days: [{ date, label, isOverride, blocks }] }
 */
export async function getPitchEditorData(pitchId) {
    const [pitch] = await db.select().from(pitches).where(eq(pitches.id, pitchId)).limit(1);
    if (!pitch) return null;

    const { date: today } = currentOperatingDay();
    const dates = Array.from({ length: EDITOR_DAYS }, (_, i) => addDaysISO(today, i));

    const overrideRows = await db
        .select()
        .from(timeBlocks)
        .where(and(eq(timeBlocks.pitchId, pitchId), inArray(timeBlocks.date, dates)))
        .orderBy(asc(timeBlocks.date), asc(timeBlocks.sortOrder));

    const byDate = new Map();
    for (const r of overrideRows) {
        if (!byDate.has(r.date)) byDate.set(r.date, []);
        byDate.get(r.date).push({
            id: r.id,
            startTime: r.startTime,
            endTime: r.endTime,
            price: String(Number(r.price)),
            sortOrder: r.sortOrder,
        });
    }

    const defaultBlocks = (Array.isArray(pitch.defaultBlocks) ? pitch.defaultBlocks : [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((b, i) => ({
            startTime: String(b.startTime),
            endTime: String(b.endTime),
            price: String(Number(b.price)),
            sortOrder: i,
        }));

    // Bookings per date, so the editor can warn before changing a day that already has bookings.
    const booked = await db
        .select({ date: bookings.bookingDate, c: sql`count(*)` })
        .from(bookings)
        .where(and(eq(bookings.pitchId, pitchId), inArray(bookings.bookingDate, dates), activeNow()))
        .groupBy(bookings.bookingDate);
    const bookedMap = new Map(booked.map((b) => [b.date, Number(b.c)]));

    return {
        pitch: toPitchAdmin(pitch),
        defaultBlocks,
        days: dates.map((date, i) => {
            const override = byDate.get(date) ?? null;
            return {
                date,
                label: i === 0 ? `Today ${Number(date.slice(8))}` : i === 1 ? `Tomorrow ${Number(date.slice(8))}` : shortDateLabel(date).replace(/ \w+$/, ""),
                isOverride: override !== null,
                bookedCount: bookedMap.get(date) ?? 0,
                blocks: override ?? defaultBlocks,
            };
        }),
    };
}