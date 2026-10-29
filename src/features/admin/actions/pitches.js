// src/features/admin/actions/pitches.js
"use server";

// Grounds + slot editor mutations. Same behaviour as the prototype's
// src/app/actions/admin.js (upsertPitch, togglePitchActive, replaceDefaultBlocks,
// replaceDateBlocks, resetDateToDefault, regenerateDefaultBlocks, seedDateFromDefault).

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { withLockedTx } from "@/db/pool";
import { conflictError, conflictsForDate, conflictsForDefault } from "@/features/admin/schedule-guard";
import { pitches, timeBlocks, SPORTS } from "@/db/schema";
import { generateDefaultBlocks, validateBlocks, deriveHours, cloneAsTemplate } from "@/features/booking/slots";

/* -------------------------------------------------------------- */
/* Helpers                                                         */
/* -------------------------------------------------------------- */

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const u = session?.user;
    if (!u || u.role !== "admin") return null;
    return u;
}

const DENIED = { ok: false, error: "শুধু অ্যাডমিন মাঠ ও স্লট বদলাতে পারেন।" };

function revalidateAll(pitchId) {
    revalidatePath("/admin");
    revalidatePath("/admin/pitches");
    if (pitchId) revalidatePath(`/admin/pitches/${pitchId}`);
    revalidatePath("/book");
    revalidatePath("/");
}

/**
 * Run a schedule write only if no active booking would lose its slot. Holds the ground's lock, so a
 * player can't reserve a slot between the check and the write. Returns a refusal or null (written).
 */
async function guardedWrite(pitchId, findConflicts, write) {
    return withLockedTx([`pitch:${pitchId}`], async () => {
        const conflicts = await findConflicts();
        if (conflicts.length) return conflictError(conflicts);
        await write();
        return null;
    });
}

function fail(err, fallback) {
    console.error(fallback, err);
    return { ok: false, error: err?.publicMessage ?? fallback };
}

function slugify(s) {
    // Bangla names have no Latin letters: keep their digits ("মাঠ ৩" -> "ground-3"), else fall back to "ground".
    const ascii = String(s).replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
    const slug = ascii
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
    if (!slug) return "ground";
    return /[a-z]/.test(slug) ? slug : `ground-${slug}`.slice(0, 60);
}

const blockSchema = z.object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    price: z.coerce.number().min(0).max(1_000_000),
});

/** Normalize blocks from the client and run the prototype's validation. */
function normalizeBlocks(blocks) {
    const parsed = z.array(blockSchema).max(48).safeParse(blocks ?? []);
    if (!parsed.success) return { ok: false, error: "কিছু স্লটের সময় বা দাম ঠিক নেই।" };
    const normalized = parsed.data.map((b, i) => ({
        startTime: b.startTime,
        endTime: b.endTime,
        price: String(Math.round(b.price)),
        sortOrder: i,
    }));
    const check = validateBlocks(normalized);
    if (!check.ok) return { ok: false, error: check.error };
    return { ok: true, blocks: normalized };
}

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/* -------------------------------------------------------------- */
/* Grounds                                                         */
/* -------------------------------------------------------------- */

const pitchSchema = z.object({
    id: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(2, "মাঠের একটি নাম দিন।").max(40),
    description: z.string().trim().max(240).optional().default(""),
    sport: z.enum(SPORTS),
    format: z.string().trim().max(30).optional().default(""),
    size: z.string().trim().max(30).optional().default(""),
    surface: z.string().trim().max(40).optional().default(""),
    hourlyRate: z.coerce.number().min(1, "ঘণ্টাপ্রতি দাম লিখুন।").max(1_000_000),
    openHour: z.coerce.number().int().min(0).max(23),
    closeHour: z.coerce.number().int().min(0).max(23),
    defaultSlotMinutes: z.coerce.number().int().min(15, "একটি স্লট কমপক্ষে ১৫ মিনিটের হতে হবে।").max(240, "একটি স্লট সর্বোচ্চ ৪ ঘণ্টার হতে পারে।"),
    imageUrl: z
        .string()
        .trim()
        .max(500)
        .optional()
        .default("")
        .refine((v) => v === "" || /^https:\/\//.test(v), "ছবির লিংক https:// দিয়ে শুরু হতে হবে"),
    imagePublicId: z.string().trim().max(300).optional().default(""),
    isActive: z.boolean().optional().default(true),
});

/** Default slots for the given hours/length; a slot with exactly the same times as before keeps its price. */
function buildSchedule(v, oldBlocks = []) {
    const oldPrice = new Map((Array.isArray(oldBlocks) ? oldBlocks : []).map((b) => [`${b.startTime}-${b.endTime}`, String(b.price)]));
    return generateDefaultBlocks({
        openHour: v.openHour,
        closeHour: v.closeHour,
        defaultSlotMinutes: v.defaultSlotMinutes,
        hourlyRate: v.hourlyRate,
    }).map((b, i) => ({
        startTime: b.startTime,
        endTime: b.endTime,
        price: oldPrice.get(`${b.startTime}-${b.endTime}`) ?? String(b.price),
        sortOrder: i,
    }));
}

/**
 * Create or update a ground. A new ground gets a generated default schedule.
 * Editing the opening hours or slot length rebuilds the default schedule to match
 * (data.rebuilt = true). Custom schedules for single dates and existing bookings are not touched.
 */
export async function upsertPitch(input) {
    try {
        if (!(await requireAdmin())) return DENIED;
        const parsed = pitchSchema.safeParse(input);
        if (!parsed.success) {
            return { ok: false, error: parsed.error.issues[0]?.message ?? "ফর্মটি দেখে নিন।", fieldErrors: parsed.error.flatten().fieldErrors };
        }
        const v = parsed.data;
        if (v.openHour === v.closeHour) return { ok: false, error: "খোলা ও বন্ধের সময় এক হতে পারে না।" };

        const values = {
            name: v.name,
            description: v.description || null,
            sport: v.sport,
            format: v.format || null,
            size: v.size || null,
            surface: v.surface || null,
            hourlyRate: String(v.hourlyRate),
            openHour: v.openHour,
            closeHour: v.closeHour,
            defaultSlotMinutes: v.defaultSlotMinutes,
            imageUrl: v.imageUrl || null,
            imagePublicId: v.imageUrl ? v.imagePublicId || null : null,
            isActive: v.isActive,
        };

        if (v.id) {
            const [old] = await db
                .select({ openHour: pitches.openHour, closeHour: pitches.closeHour, defaultSlotMinutes: pitches.defaultSlotMinutes, defaultBlocks: pitches.defaultBlocks })
                .from(pitches)
                .where(eq(pitches.id, v.id))
                .limit(1);
            if (!old) return { ok: false, error: "মাঠটি পাওয়া যায়নি।" };

            const rebuilt =
                old.openHour !== v.openHour || old.closeHour !== v.closeHour || old.defaultSlotMinutes !== v.defaultSlotMinutes;
            if (rebuilt) {
                const blocks = buildSchedule(v, old.defaultBlocks);
                if (!blocks.length) return { ok: false, error: "এই সময় একটি স্লটের চেয়েও কম। বেশি সময় খোলা রাখুন বা ছোট স্লট সিলেক্ট করুন।" };
                values.defaultBlocks = blocks;
            }

            const refused = await guardedWrite(
                v.id,
                () => (rebuilt ? conflictsForDefault(v.id, values.defaultBlocks) : []),
                () => db.update(pitches).set(values).where(eq(pitches.id, v.id))
            );
            if (refused) return refused;
            revalidateAll(v.id);
            return { ok: true, data: { pitchId: v.id, rebuilt } };
        }

        const template = buildSchedule(v);
        if (!template.length) return { ok: false, error: "এই সময় একটি স্লটের চেয়েও কম। বেশি সময় খোলা রাখুন বা ছোট স্লট সিলেক্ট করুন।" };

        // Unique slug: "pitch-c", "pitch-c-2", ...
        const base = slugify(v.name);
        const [{ c }] = await db
            .select({ c: sql`count(*)` })
            .from(pitches)
            .where(sql`${pitches.slug} = ${base} or ${pitches.slug} like ${base + "-%"}`);
        const slug = Number(c) === 0 ? base : `${base}-${Number(c) + 1}`;

        const [{ max }] = await db.select({ max: sql`coalesce(max(${pitches.sortOrder}), -1)` }).from(pitches);

        const [row] = await db
            .insert(pitches)
            .values({ ...values, slug, defaultBlocks: template, sortOrder: Number(max) + 1 })
            .returning({ id: pitches.id });

        revalidateAll(row.id);
        return { ok: true, data: { pitchId: row.id } };
    } catch (err) {
        return fail(err, "মাঠ সেভ হয়নি। আবার চেষ্টা করুন।");
    }
}

/** Open or close a ground for booking. */
export async function togglePitchActive(pitchId) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success) return { ok: false, error: "মাঠটি পাওয়া যায়নি।" };

        const [row] = await db.select({ isActive: pitches.isActive }).from(pitches).where(eq(pitches.id, pitchId)).limit(1);
        if (!row) return { ok: false, error: "মাঠটি পাওয়া যায়নি।" };

        await db.update(pitches).set({ isActive: !row.isActive }).where(eq(pitches.id, pitchId));
        revalidateAll(pitchId);
        return { ok: true, data: { isActive: !row.isActive } };
    } catch (err) {
        return fail(err, "মাঠ বদলানো যায়নি। আবার চেষ্টা করুন।");
    }
}

/* -------------------------------------------------------------- */
/* Slot editor                                                     */
/* -------------------------------------------------------------- */

/** Replace the ground's default schedule (used for every day without a custom schedule). */
export async function replaceDefaultBlocks(pitchId, blocks) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success) return { ok: false, error: "মাঠটি পাওয়া যায়নি।" };

        const n = normalizeBlocks(blocks);
        if (!n.ok) return n;
        const { openHour, closeHour } = deriveHours(n.blocks);

        const refused = await guardedWrite(
            pitchId,
            () => conflictsForDefault(pitchId, n.blocks),
            () => db.update(pitches).set({ defaultBlocks: n.blocks, openHour, closeHour }).where(eq(pitches.id, pitchId))
        );
        if (refused) return refused;

        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "প্রতিদিনের স্লট সেভ হয়নি। আবার চেষ্টা করুন।");
    }
}

async function writeDateBlocks(pitchId, date, blocks) {
    await db.delete(timeBlocks).where(and(eq(timeBlocks.pitchId, pitchId), eq(timeBlocks.date, date)));
    if (blocks.length > 0) {
        await db.insert(timeBlocks).values(
            blocks.map((b) => ({
                pitchId,
                date,
                startTime: b.startTime,
                endTime: b.endTime,
                price: String(b.price),
                sortOrder: b.sortOrder,
                isActive: true,
            }))
        );
    }
}

/** Save a custom schedule for one date (overrides the default for that date only). */
export async function replaceDateBlocks(pitchId, date, blocks) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success || !isoDate.safeParse(date).success) return { ok: false, error: "মাঠ বা তারিখ পাওয়া যায়নি।" };

        const n = normalizeBlocks(blocks);
        if (!n.ok) return n;

        const refused = await guardedWrite(
            pitchId,
            () => conflictsForDate(pitchId, date, n.blocks),
            () => writeDateBlocks(pitchId, date, n.blocks)
        );
        if (refused) return refused;

        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "এই দিনের স্লট সেভ হয়নি। আবার চেষ্টা করুন।");
    }
}

/** Remove a date's custom schedule so the default applies again. */
export async function resetDateToDefault(pitchId, date) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success || !isoDate.safeParse(date).success) return { ok: false, error: "মাঠ বা তারিখ পাওয়া যায়নি।" };

        const [pitch] = await db.select({ defaultBlocks: pitches.defaultBlocks }).from(pitches).where(eq(pitches.id, pitchId)).limit(1);
        if (!pitch) return { ok: false, error: "মাঠটি পাওয়া যায়নি।" };
        const refused = await guardedWrite(
            pitchId,
            () => conflictsForDate(pitchId, date, pitch.defaultBlocks),
            () => db.delete(timeBlocks).where(and(eq(timeBlocks.pitchId, pitchId), eq(timeBlocks.date, date)))
        );
        if (refused) return refused;
        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "এই দিন আগের মতো করা যায়নি। আবার চেষ্টা করুন।");
    }
}

/** Rebuild the default schedule from the ground's hours, slot length and hourly rate. */
export async function regenerateDefaultBlocks(pitchId) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success) return { ok: false, error: "মাঠটি পাওয়া যায়নি।" };

        const [pitch] = await db.select().from(pitches).where(eq(pitches.id, pitchId)).limit(1);
        if (!pitch) return { ok: false, error: "মাঠটি পাওয়া যায়নি।" };

        const template = generateDefaultBlocks({
            openHour: pitch.openHour,
            closeHour: pitch.closeHour,
            defaultSlotMinutes: pitch.defaultSlotMinutes,
            hourlyRate: Number(pitch.hourlyRate),
        }).map((b, i) => ({ startTime: b.startTime, endTime: b.endTime, price: String(b.price), sortOrder: i }));

        const refused = await guardedWrite(
            pitchId,
            () => conflictsForDefault(pitchId, template),
            () => db.update(pitches).set({ defaultBlocks: template }).where(eq(pitches.id, pitchId))
        );
        if (refused) return refused;
        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "স্লট আবার তৈরি করা যায়নি। আবার চেষ্টা করুন।");
    }
}

/** Copy the default schedule into a date as a custom schedule, ready to tweak. */
export async function seedDateFromDefault(pitchId, date) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success || !isoDate.safeParse(date).success) return { ok: false, error: "মাঠ বা তারিখ পাওয়া যায়নি।" };

        const [pitch] = await db.select().from(pitches).where(eq(pitches.id, pitchId)).limit(1);
        if (!pitch) return { ok: false, error: "মাঠটি পাওয়া যায়নি।" };

        const template = Array.isArray(pitch.defaultBlocks)
            ? cloneAsTemplate(pitch.defaultBlocks.map((b, i) => ({ ...b, sortOrder: b.sortOrder ?? i })))
            : [];

        const refused = await guardedWrite(
            pitchId,
            () => conflictsForDate(pitchId, date, template),
            () => writeDateBlocks(pitchId, date, template)
        );
        if (refused) return refused;

        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "প্রতিদিনের স্লট কপি করা যায়নি। আবার চেষ্টা করুন।");
    }
}