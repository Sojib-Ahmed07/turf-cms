// src/features/booking/components/DateStrip.jsx
"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * Next `days` dates as a scrollable strip (one month on /book). `value` is an index.
 * The arrows scroll the strip; the selected date is kept in view (also when it comes from ?date=).
 * The heading shows the selected date's month, and the 1st of each month carries its short month name.
 */
export default function DateStrip({ start = new Date(), days = 30, value = 0, onChange }) {
    const { t, f } = useI18n();
    const scroller = useRef(null);
    const dates = Array.from({ length: days }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
    const selected = dates[Math.min(Math.max(value, 0), dates.length - 1)] ?? dates[0];

    // Keep the selected tile visible (DOM only, no state).
    useEffect(() => {
        const el = scroller.current?.querySelector('[aria-checked="true"]');
        el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }, [value]);

    function scrollBy(dir) {
        const el = scroller.current;
        if (!el) return;
        el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.8), behavior: "smooth" });
    }

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="text-[15px] font-semibold text-ink">
                    {f.monthName(selected.getMonth() + 1)} {f.digits(selected.getFullYear())}
                </p>
                <div className="hidden gap-1 sm:flex">
                    <button
                        type="button"
                        onClick={() => scrollBy(-1)}
                        aria-label={t("dates.earlier")}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-3 ring-1 ring-line hover:bg-white hover:text-ink"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollBy(1)}
                        aria-label={t("dates.later")}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-3 ring-1 ring-line hover:bg-white hover:text-ink"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div
                ref={scroller}
                role="radiogroup"
                aria-label={t("dates.label")}
                className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 sm:mx-0 sm:scroll-px-0 sm:px-0"
            >
                {dates.map((d, i) => {
                    const active = i === value;
                    const weekend = d.getDay() === 5 || d.getDay() === 6; // Fri/Sat in BD
                    const newMonth = i > 0 && d.getDate() === 1;
                    return (
                        <button
                            key={i}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onChange?.(i)}
                            className={cn(
                                "flex h-[84px] w-[64px] shrink-0 snap-start flex-col items-center justify-center rounded-[16px] transition-colors",
                                active ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink-4"
                            )}
                        >
                            <span className={cn("text-[12px] font-medium", active ? "text-white/70" : "text-ink-3")}>
                                {i === 0 ? t("common.today") : newMonth ? f.monthShort(d.getMonth() + 1) : f.dayShort(d.getDay())}
                            </span>
                            <span className="display mt-1 text-[26px] leading-none tnum">{f.digits(d.getDate())}</span>
                            <span className={cn("mt-1.5 h-1 w-1 rounded-full", weekend ? "bg-flare" : "bg-transparent")} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}