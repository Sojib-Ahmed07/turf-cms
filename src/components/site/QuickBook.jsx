// src/components/site/QuickBook.jsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, MapPin, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import { addDaysISO, shortDateLabel } from "@/lib/time";
import { cn } from "@/lib/utils";

// Value is passed to /book as ?part= and picks the first free slot in that range.
const TIMES = [
    { value: "morning", label: "Morning" },
    { value: "day", label: "Day" },
    { value: "evening", label: "Evening" },
    { value: "late", label: "Late night" },
];
const DAYS = 7;

/**
 * Booking shortcut that overlaps the bottom of the hero.
 * pitches: active grounds; startDate: today's operating day "YYYY-MM-DD" (Asia/Dhaka).
 */
export default function QuickBook({ pitches = [], startDate }) {
    const router = useRouter();
    const [pitchId, setPitchId] = useState("");
    const [date, setDate] = useState(startDate ?? "");
    const [part, setPart] = useState("evening");
    const [busy, setBusy] = useState(false);

    const dates = useMemo(() => {
        if (!startDate) return [];
        return Array.from({ length: DAYS }, (_, i) => {
            const iso = addDaysISO(startDate, i);
            const label = shortDateLabel(iso); // "Tue 13 Oct"
            return {
                value: iso,
                label: i === 0 ? `Today, ${label.slice(4)}` : i === 1 ? `Tomorrow, ${label.slice(4)}` : label,
            };
        });
    }, [startDate]);

    const pitch = pitches.find((p) => p.id === pitchId);
    const pitchLabel = pitch ? [pitch.name, pitch.format].filter(Boolean).join(", ") : "Any ground";
    const dateLabel = dates.find((d) => d.value === date)?.label ?? "Pick a date";

    function onSubmit(e) {
        e.preventDefault();
        const q = new URLSearchParams();
        if (pitchId) q.set("pitch", pitchId);
        if (date) q.set("date", date);
        q.set("part", part);
        setBusy(true);
        router.push(`/book?${q.toString()}`);
    }

    return (
        <div className="relative z-10 mx-auto mt-3 max-w-6xl px-3 sm:px-6 lg:-mt-11">
            <form
                onSubmit={onSubmit}
                className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-line shadow-[0_24px_60px_-28px_rgb(11_59_44/0.45)] ring-1 ring-line lg:grid-cols-[1.1fr_1fr_1.5fr_auto]"
            >
                <Picker
                    icon={MapPin}
                    label="Ground"
                    value={pitchLabel}
                    className="col-span-2 sm:col-span-1"
                    select={
                        <select value={pitchId} onChange={(e) => setPitchId(e.target.value)} aria-label="Ground">
                            <option value="">Any ground</option>
                            {pitches.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {[p.name, p.format].filter(Boolean).join(", ")}
                                </option>
                            ))}
                        </select>
                    }
                />
                <Picker
                    icon={CalendarDays}
                    label="Date"
                    value={dateLabel}
                    className="col-span-2 sm:col-span-1"
                    select={
                        <select value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date">
                            {dates.map((d) => (
                                <option key={d.value} value={d.value}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    }
                />

                <div className="col-span-2 bg-white px-5 py-3.5 lg:col-span-1">
                    <span className="text-xs font-medium text-ink-3">Time of day</span>
                    <div className="mt-1.5 flex gap-1 rounded-full bg-chalk p-1" role="radiogroup" aria-label="Time of day">
                        {TIMES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                role="radio"
                                aria-checked={part === t.value}
                                onClick={() => setPart(t.value)}
                                className={cn(
                                    "flex-1 rounded-full px-2 py-1.5 text-[13px] font-semibold transition-colors",
                                    part === t.value ? "bg-ink text-white" : "text-ink-3 hover:text-ink"
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="col-span-2 flex items-center bg-white p-3 lg:col-span-1">
                    <Button type="submit" size="lg" disabled={busy} className="w-full lg:h-full lg:rounded-[16px] lg:px-8">
                        <Search className="h-[18px] w-[18px]" />
                        {busy ? "Opening slots" : "Find free slots"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

/** Looks like a button; a transparent native <select> on top does the picking (works well on phones). */
function Picker({ icon: Icon, label, value, className, select }) {
    return (
        <label className={cn("group relative flex cursor-pointer items-center gap-3 bg-white px-5 py-4 text-left hover:bg-chalk/60", className)}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-grass text-pitch">
                <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-ink-3">{label}</span>
                <span className="block truncate text-[15px] font-semibold text-ink">{value}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-ink-4 transition-transform group-hover:translate-y-0.5" />
            <span className="absolute inset-0 [&>select]:h-full [&>select]:w-full [&>select]:cursor-pointer [&>select]:opacity-0">
                {select}
            </span>
        </label>
    );
}