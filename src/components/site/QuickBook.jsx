// src/components/site/QuickBook.jsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, MapPin, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import { PARTS } from "@/features/booking/parts";
import { addDaysISO } from "@/lib/time";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Value is passed to /book as ?part= and picks the first free slot in that part of the day.
// Only parts the chosen ground (or any ground) actually has slots in are shown.
const SHORT_KEY = { morning: "parts.morning", day: "parts.dayShort", evening: "parts.evening", late: "parts.late" };
const DAYS = 7;

/**
 * Booking shortcut that overlaps the bottom of the hero.
 * pitches: active grounds; startDate: today's operating day "YYYY-MM-DD" (Asia/Dhaka).
 */
export default function QuickBook({ pitches = [], startDate }) {
    const { t, f } = useI18n();
    const router = useRouter();
    const [pitchId, setPitchId] = useState("");
    const [date, setDate] = useState(startDate ?? "");
    const [picked, setPicked] = useState("evening");
    const [busy, setBusy] = useState(false);

    const dates = useMemo(() => {
        if (!startDate) return [];
        return Array.from({ length: DAYS }, (_, i) => {
            const iso = addDaysISO(startDate, i);
            return {
                value: iso,
                label:
                    i === 0
                        ? t("quick.todayOn", { date: f.dayMonth(iso) })
                        : i === 1
                            ? t("quick.tomorrowOn", { date: f.dayMonth(iso) })
                            : f.date(iso),
            };
        });
    }, [startDate, t, f]);

    const pitch = pitches.find((p) => p.id === pitchId);
    const available = new Set((pitch ? [pitch] : pitches).flatMap((p) => p.parts ?? PARTS.map((x) => x.key)));
    const times = PARTS.filter((p) => available.has(p.key)).map((p) => ({ value: p.key, label: t(SHORT_KEY[p.key]) }));
    // keep the player's choice when this ground has it, otherwise the nearest sensible part
    const part = times.some((t) => t.value === picked) ? picked : (times.find((t) => t.value === "evening") ?? times[0])?.value ?? "";
    const pitchLabel = pitch ? [pitch.name, pitch.format].filter(Boolean).join(", ") : t("quick.anyGround");
    const dateLabel = dates.find((d) => d.value === date)?.label ?? t("quick.pickDate");

    function onSubmit(e) {
        e.preventDefault();
        const q = new URLSearchParams();
        if (pitchId) q.set("pitch", pitchId);
        if (date) q.set("date", date);
        if (part) q.set("part", part);
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
                    label={t("quick.ground")}
                    value={pitchLabel}
                    className="col-span-2 sm:col-span-1"
                    select={
                        <select value={pitchId} onChange={(e) => setPitchId(e.target.value)} aria-label={t("quick.ground")}>
                            <option value="">{t("quick.anyGround")}</option>
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
                    label={t("quick.date")}
                    value={dateLabel}
                    className="col-span-2 sm:col-span-1"
                    select={
                        <select value={date} onChange={(e) => setDate(e.target.value)} aria-label={t("quick.date")}>
                            {dates.map((d) => (
                                <option key={d.value} value={d.value}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    }
                />

                <div className="col-span-2 bg-white px-5 py-3.5 lg:col-span-1">
                    <span className="text-xs font-medium text-ink-3">{t("quick.timeOfDay")}</span>
                    <div className="mt-1.5 flex gap-1 rounded-full bg-chalk p-1" role="radiogroup" aria-label={t("quick.timeOfDay")}>
                        {times.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                role="radio"
                                aria-checked={part === t.value}
                                onClick={() => setPicked(t.value)}
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
                        {busy ? t("quick.opening") : t("quick.find")}
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