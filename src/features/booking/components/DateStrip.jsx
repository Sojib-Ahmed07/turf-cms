// src/features/booking/components/DateStrip.jsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Next `days` dates as a scrollable strip. `value` is an index. */
export default function DateStrip({ start = new Date(), days = 14, value = 0, onChange }) {
    const dates = Array.from({ length: days }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
    const first = dates[0];

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="text-[15px] font-semibold text-ink">
                    {MON[first.getMonth()]} {first.getFullYear()}
                </p>
                <div className="hidden gap-1 sm:flex">
                    <button type="button" aria-label="Earlier dates" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 ring-1 ring-line hover:bg-white hover:text-ink">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Later dates" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 ring-1 ring-line hover:bg-white hover:text-ink">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div role="radiogroup" aria-label="Date" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {dates.map((d, i) => {
                    const active = i === value;
                    const weekend = d.getDay() === 5 || d.getDay() === 6; // Fri/Sat in BD
                    return (
                        <button
                            key={i}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onChange?.(i)}
                            className={cn(
                                "flex h-[84px] w-[64px] shrink-0 flex-col items-center justify-center rounded-[16px] transition-colors",
                                active ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink-4"
                            )}
                        >
                            <span className={cn("text-[12px] font-medium", active ? "text-white/70" : "text-ink-3")}>
                                {i === 0 ? "Today" : DAY[d.getDay()]}
                            </span>
                            <span className="display mt-1 text-[26px] leading-none tnum">{d.getDate()}</span>
                            <span
                                className={cn(
                                    "mt-1.5 h-1 w-1 rounded-full",
                                    weekend ? (active ? "bg-flare" : "bg-flare") : "bg-transparent"
                                )}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
