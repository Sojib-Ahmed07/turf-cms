// src/features/booking/slots.js  (ported from the prototype: src/lib/slots.js; validateBlocks updated 27 Oct)
/* -------------------------------------------------------------- */
/* Slot / block engine                                             */
/*                                                               */
/* Pure functions only — no DB access. Used by:                    */
/*   - server actions to generate + validate block sequences       */
/*   - SlotEditor (client) to mutate the draft grid                */
/*                                                               */
/* Model:                                                          */
/*   - A pitch owns a sorted list of time blocks.                  */
/*   - Blocks do NOT have to be contiguous. Empty time = no slot.  */
/*   - Each block: { startTime, endTime, price, sortOrder }.       */
/*   - openHour  = hour of first block's startTime                 */
/*   - closeHour = hour of last block's endTime                    */
/*   - Extend a block: shift every following block right by Δ.     */
/*   - Shrink a block: shift every following block left by Δ.      */
/*   - Delete a block: just remove it (leaves a hole in the day).  */
/* -------------------------------------------------------------- */

import { makeFormat } from "@/i18n/format";

const BN = makeFormat("bn");

export const MIN_SLOT_MINUTES = 15;
export const MAX_SLOT_MINUTES = 8 * 60; // 8 hours max per block

/* ---- time math ---- */

export function hhmmToMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

export function minutesToHHMM(mins) {
    const m = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function minutesBetween(startHHMM, endHHMM) {
    let s = hhmmToMinutes(startHHMM);
    let e = hhmmToMinutes(endHHMM);
    if (e <= s) e += 1440;
    return e - s;
}

/* ---- generation ---- */

/**
 * Generate a fresh contiguous sequence of bookable blocks.
 * @returns {Array<{startTime,endTime,price,sortOrder}>}
 */
export function generateDefaultBlocks({
    openHour = 6,
    closeHour = 3,
    defaultSlotMinutes = 90,
    hourlyRate = 0,
}) {
    const openMins = openHour * 60;
    const span = ((closeHour - openHour + 24) % 24) * 60;
    const total = span === 0 ? 24 * 60 : span;

    const blocks = [];
    let offset = 0;
    let order = 0;

    while (offset + defaultSlotMinutes <= total) {
        const startMins = openMins + offset;
        const endMins = startMins + defaultSlotMinutes;
        const price = Math.round((Number(hourlyRate) * defaultSlotMinutes) / 60);
        blocks.push({
            startTime: minutesToHHMM(startMins),
            endTime: minutesToHHMM(endMins),
            price: String(price),
            sortOrder: order++,
        });
        offset += defaultSlotMinutes;
    }

    const leftover = total - offset;
    if (leftover >= MIN_SLOT_MINUTES) {
        const startMins = openMins + offset;
        const endMins = startMins + leftover;
        const price = Math.round((Number(hourlyRate) * leftover) / 60);
        blocks.push({
            startTime: minutesToHHMM(startMins),
            endTime: minutesToHHMM(endMins),
            price: String(price),
            sortOrder: order++,
        });
    }

    return blocks;
}

/* ---- hour derivation ---- */

/**
 * Derive { openHour, closeHour } from a block list.
 * Uses the FIRST and LAST blocks (sorted by sortOrder).
 */
export function deriveHours(blocks) {
    if (!blocks.length) return { openHour: 6, closeHour: 3 };
    const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const openHour = Math.floor(hhmmToMinutes(first.startTime) / 60);
    const closeHour = Math.floor(hhmmToMinutes(last.endTime) / 60);
    return { openHour, closeHour };
}

/* ---- validation ---- */

/**
 * Validate a block list.
 * Rules:
 *   - at least one block
 *   - each duration between MIN and MAX
 *   - each block has price > 0
 *   - blocks must not overlap (they may have gaps between them)
 */
export function validateBlocks(blocks) {
    const r = (b) => `${BN.time(b.startTime)} থেকে ${BN.time(b.endTime)}`;
    if (!Array.isArray(blocks) || blocks.length === 0) {
        return { ok: false, error: "কমপক্ষে একটি স্লট লাগবে।" };
    }

    const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);

    for (let i = 0; i < sorted.length; i++) {
        const b = sorted[i];
        const dur = minutesBetween(b.startTime, b.endTime);
        if (dur < MIN_SLOT_MINUTES) {
            return {
                ok: false,
                error: `${r(b)} স্লটটি ${BN.digits(MIN_SLOT_MINUTES)} মিনিটের চেয়ে ছোট।`,
            };
        }
        if (dur > MAX_SLOT_MINUTES) {
            return {
                ok: false,
                error: `${r(b)} স্লটটি ${BN.digits(MAX_SLOT_MINUTES / 60)} ঘণ্টার চেয়ে বড়।`,
            };
        }
        if (Number(b.price) <= 0) {
            return {
                ok: false,
                error: `${r(b)} স্লটের দাম ০-এর বেশি হতে হবে।`,
            };
        }
    }

    // Place every block on the sheet's own clock: the day starts at the first block, and a block that
    // starts earlier than that is after midnight. Blocks must run forward without overlapping, and the
    // whole sheet must fit in 24 hours, so its late slots never run into the next day's first slot.
    const first = hhmmToMinutes(sorted[0].startTime);
    const dayEnd = first + 1440;
    let prevEnd = null;
    for (let i = 0; i < sorted.length; i++) {
        const b = sorted[i];
        const start = ((hhmmToMinutes(b.startTime) - first + 1440) % 1440) + first;
        const end = start + minutesBetween(b.startTime, b.endTime);
        if (prevEnd !== null && start < prevEnd) {
            const prev = sorted[i - 1];
            return {
                ok: false,
                error: `${r(prev)} আর ${r(b)} স্লটের সময় একটির ওপর আরেকটি পড়ছে।`,
            };
        }
        if (end > dayEnd) {
            return {
                ok: false,
                error: `${r(b)} স্লটটি পরের সকালের ${BN.time(sorted[0].startTime)} পার হয়ে পরের দিনের প্রথম স্লটে ঢুকে যাচ্ছে। এক দিনের সব স্লট ২৪ ঘণ্টার মধ্যে থাকতে হবে।`,
            };
        }
        prevEnd = end;
    }

    return { ok: true };
}

/* ---- resize ---- */

/**
 * Resize a block by deltaMinutes. Positive extends, negative shrinks.
 *
 * Extend (+Δ): this block's end moves +Δ, every following block shifts right.
 * Shrink (−Δ): this block's end moves −Δ, every following block shifts left.
 *
 * Returns { blocks, note }.
 */
export function applyResize(blocks, index, deltaMinutes) {
    if (!blocks[index]) return { blocks, note: null };

    const working = blocks.map((b) => ({ ...b }));
    const target = working[index];

    const origDur = minutesBetween(target.startTime, target.endTime);
    const newDur = origDur + deltaMinutes;

    if (newDur < MIN_SLOT_MINUTES) {
        return { blocks, note: `একটি স্লট কমপক্ষে ${BN.digits(MIN_SLOT_MINUTES)} মিনিটের হতে হবে।` };
    }
    if (newDur > MAX_SLOT_MINUTES) {
        return { blocks, note: `একটি স্লট সর্বোচ্চ ${BN.digits(MAX_SLOT_MINUTES / 60)} ঘণ্টার হতে পারে।` };
    }

    const targetStartMins = hhmmToMinutes(target.startTime);
    target.endTime = minutesToHHMM(targetStartMins + newDur);

    for (let i = index + 1; i < working.length; i++) {
        const b = working[i];
        b.startTime = minutesToHHMM(hhmmToMinutes(b.startTime) + deltaMinutes);
        b.endTime = minutesToHHMM(hhmmToMinutes(b.endTime) + deltaMinutes);
    }

    working.forEach((b, i) => (b.sortOrder = i));

    let note = null;
    if (deltaMinutes > 0) note = "পরের স্লটগুলো পিছিয়ে গেছে।";
    else if (deltaMinutes < 0) note = "পরের স্লটগুলো এগিয়ে এসেছে।";

    return { blocks: working, note };
}

/* ---- delete ---- */

/**
 * Delete a block. Following blocks do NOT shift — the deleted time
 * becomes an empty hole in the day.
 */
export function deleteBlock(blocks, index) {
    const working = blocks.map((b) => ({ ...b }));
    working.splice(index, 1);
    working.forEach((b, i) => (b.sortOrder = i));
    return working;
}

/* ---- clone ---- */

/**
 * Clone a block array as plain template rows (no id).
 * Used when seeding a per-date override from the default.
 */
export function cloneAsTemplate(blocks) {
    return blocks
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((b, i) => ({
            startTime: b.startTime,
            endTime: b.endTime,
            price: String(b.price),
            sortOrder: i,
        }));
}

/* ---- display formatting ---- */

/**
 * "HH:MM" → Bangla 12-hour time, e.g. "13:00" → "দুপুর ১টা", "00:30" → "রাত ১২:৩০"
 */
export function format12h(hhmm) {
    if (!hhmm) return "";
    return BN.time(hhmm);
}

export function format12hRange(startTime, endTime) {
    return `${format12h(startTime)} থেকে ${format12h(endTime)}`;
}

/**
 * Format an integer hour (0–23) as Bangla: 6 → "সকাল ৬টা", 13 → "দুপুর ১টা".
 */
export function formatHour12(hour24) {
    const h = ((Number(hour24) % 24) + 24) % 24;
    return BN.time(`${String(h).padStart(2, "0")}:00`);
}

/**
 * Build the list of hour options for the admin dropdown.
 * Returns 24 entries: { value: 0..23, label: "রাত ১২টা".."রাত ১১টা" }.
 */
export function hourOptions() {
    return Array.from({ length: 24 }, (_, h) => ({
        value: h,
        label: formatHour12(h),
    }));
}