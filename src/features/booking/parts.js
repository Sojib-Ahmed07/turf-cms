// src/features/booking/parts.js
// Parts of the day used to group slots on /book and in the home page search.
// Pure and safe in the browser. A slot is put in a part by the clock time it starts at;
// slots played after midnight (late = true) always count as "Late night".

export const PARTS = [
    { key: "morning", label: "Morning" },
    { key: "day", label: "Afternoon" },
    { key: "evening", label: "Evening" },
    { key: "late", label: "Late night" },
];

/** "morning" | "day" | "evening" | "late" for a slot starting at "HH:MM". */
export function partOf(start, late = false) {
    if (late) return "late";
    const h = Number(String(start).slice(0, 2));
    if (h >= 22) return "late";
    if (h >= 17) return "evening";
    if (h >= 12) return "day";
    return "morning";
}

/** Parts that have at least one slot, in day order. blocks: [{ start | startTime, late? }] */
export function partsOf(blocks = []) {
    const has = new Set(blocks.map((b) => partOf(b.start ?? b.startTime, b.late)));
    return PARTS.map((p) => p.key).filter((k) => has.has(k));
}