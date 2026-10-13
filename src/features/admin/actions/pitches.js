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

const DENIED = { ok: false, error: "Only admins can change grounds and slots." };

function revalidateAll(pitchId) {
    revalidatePath("/admin");
    revalidatePath("/admin/pitches");
    if (pitchId) revalidatePath(`/admin/pitches/${pitchId}`);
    revalidatePath("/book");
    revalidatePath("/");
}

function fail(err, fallback) {
    console.error(fallback, err);
    return { ok: false, error: err?.publicMessage ?? fallback };
}

function slugify(s) {
    return (
        String(s)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "ground"
    );
}

const blockSchema = z.object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    price: z.coerce.number().min(0).max(1_000_000),
});

/** Normalize blocks from the client and run the prototype's validation. */
function normalizeBlocks(blocks) {
    const parsed = z.array(blockSchema).max(48).safeParse(blocks ?? []);
    if (!parsed.success) return { ok: false, error: "Some blocks have an invalid time or price." };
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
    name: z.string().trim().min(2, "Give the ground a name.").max(40),
    description: z.string().trim().max(240).optional().default(""),
    sport: z.enum(SPORTS),
    format: z.string().trim().max(30).optional().default(""),
    size: z.string().trim().max(30).optional().default(""),
    surface: z.string().trim().max(40).optional().default(""),
    hourlyRate: z.coerce.number().min(1, "Set a price per hour.").max(1_000_000),
    openHour: z.coerce.number().int().min(0).max(23),
    closeHour: z.coerce.number().int().min(0).max(23),
    defaultSlotMinutes: z.coerce.number().int().min(15, "Slots must be at least 15 minutes.").max(240, "Slots can be at most 4 hours."),
    imageUrl: z
        .string()
        .trim()
        .max(500)
        .optional()
        .default("")
        .refine((v) => v === "" || /^https:\/\//.test(v), "Image link must start with https://"),
    isActive: z.boolean().optional().default(true),
});

/** Create or update a ground. A new ground gets a generated default schedule. */
export async function upsertPitch(input) {
    try {
        if (!(await requireAdmin())) return DENIED;
        const parsed = pitchSchema.safeParse(input);
        if (!parsed.success) {
            return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form.", fieldErrors: parsed.error.flatten().fieldErrors };
        }
        const v = parsed.data;
        if (v.openHour === v.closeHour) return { ok: false, error: "Opening and closing hour can't be the same." };

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
            isActive: v.isActive,
        };

        if (v.id) {
            await db.update(pitches).set(values).where(eq(pitches.id, v.id));
            revalidateAll(v.id);
            return { ok: true, data: { pitchId: v.id } };
        }

        const template = generateDefaultBlocks({
            openHour: v.openHour,
            closeHour: v.closeHour,
            defaultSlotMinutes: v.defaultSlotMinutes,
            hourlyRate: v.hourlyRate,
        }).map((b, i) => ({ startTime: b.startTime, endTime: b.endTime, price: String(b.price), sortOrder: i }));

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
        return fail(err, "Couldn't save the ground. Try again.");
    }
}

/** Open or close a ground for booking. */
export async function togglePitchActive(pitchId) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success) return { ok: false, error: "Ground not found." };

        const [row] = await db.select({ isActive: pitches.isActive }).from(pitches).where(eq(pitches.id, pitchId)).limit(1);
        if (!row) return { ok: false, error: "Ground not found." };

        await db.update(pitches).set({ isActive: !row.isActive }).where(eq(pitches.id, pitchId));
        revalidateAll(pitchId);
        return { ok: true, data: { isActive: !row.isActive } };
    } catch (err) {
        return fail(err, "Couldn't change the ground. Try again.");
    }
}

/* -------------------------------------------------------------- */
/* Slot editor                                                     */
/* -------------------------------------------------------------- */

/** Replace the ground's default schedule (used for every day without a custom schedule). */
export async function replaceDefaultBlocks(pitchId, blocks) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success) return { ok: false, error: "Ground not found." };

        const n = normalizeBlocks(blocks);
        if (!n.ok) return n;
        const { openHour, closeHour } = deriveHours(n.blocks);

        await db
            .update(pitches)
            .set({ defaultBlocks: n.blocks, openHour, closeHour })
            .where(eq(pitches.id, pitchId));

        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "Couldn't save the default schedule. Try again.");
    }
}

/** Save a custom schedule for one date (overrides the default for that date only). */
export async function replaceDateBlocks(pitchId, date, blocks) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success || !isoDate.safeParse(date).success) return { ok: false, error: "Ground or date not found." };

        const n = normalizeBlocks(blocks);
        if (!n.ok) return n;

        await db.delete(timeBlocks).where(and(eq(timeBlocks.pitchId, pitchId), eq(timeBlocks.date, date)));
        if (n.blocks.length > 0) {
            await db.insert(timeBlocks).values(
                n.blocks.map((b) => ({
                    pitchId,
                    date,
                    startTime: b.startTime,
                    endTime: b.endTime,
                    price: b.price,
                    sortOrder: b.sortOrder,
                    isActive: true,
                }))
            );
        }

        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "Couldn't save this day. Try again.");
    }
}

/** Remove a date's custom schedule so the default applies again. */
export async function resetDateToDefault(pitchId, date) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success || !isoDate.safeParse(date).success) return { ok: false, error: "Ground or date not found." };

        await db.delete(timeBlocks).where(and(eq(timeBlocks.pitchId, pitchId), eq(timeBlocks.date, date)));
        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "Couldn't reset this day. Try again.");
    }
}

/** Rebuild the default schedule from the ground's hours, slot length and hourly rate. */
export async function regenerateDefaultBlocks(pitchId) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success) return { ok: false, error: "Ground not found." };

        const [pitch] = await db.select().from(pitches).where(eq(pitches.id, pitchId)).limit(1);
        if (!pitch) return { ok: false, error: "Ground not found." };

        const template = generateDefaultBlocks({
            openHour: pitch.openHour,
            closeHour: pitch.closeHour,
            defaultSlotMinutes: pitch.defaultSlotMinutes,
            hourlyRate: Number(pitch.hourlyRate),
        }).map((b, i) => ({ startTime: b.startTime, endTime: b.endTime, price: String(b.price), sortOrder: i }));

        await db.update(pitches).set({ defaultBlocks: template }).where(eq(pitches.id, pitchId));
        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "Couldn't rebuild the schedule. Try again.");
    }
}

/** Copy the default schedule into a date as a custom schedule, ready to tweak. */
export async function seedDateFromDefault(pitchId, date) {
    try {
        if (!(await requireAdmin())) return DENIED;
        if (!uuid.safeParse(pitchId).success || !isoDate.safeParse(date).success) return { ok: false, error: "Ground or date not found." };

        const [pitch] = await db.select().from(pitches).where(eq(pitches.id, pitchId)).limit(1);
        if (!pitch) return { ok: false, error: "Ground not found." };

        const template = Array.isArray(pitch.defaultBlocks)
            ? cloneAsTemplate(pitch.defaultBlocks.map((b, i) => ({ ...b, sortOrder: b.sortOrder ?? i })))
            : [];

        await db.delete(timeBlocks).where(and(eq(timeBlocks.pitchId, pitchId), eq(timeBlocks.date, date)));
        if (template.length > 0) {
            await db.insert(timeBlocks).values(
                template.map((b) => ({
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

        revalidateAll(pitchId);
        return { ok: true };
    } catch (err) {
        return fail(err, "Couldn't copy the default schedule. Try again.");
    }
}