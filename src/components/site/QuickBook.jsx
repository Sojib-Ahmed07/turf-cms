// src/components/site/QuickBook.jsx
"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, MapPin, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const TIMES = ["Morning", "Day", "Evening", "Late night"];

/** Booking shortcut that overlaps the bottom of the hero. */
export default function QuickBook({ pitches = [] }) {
    const [time, setTime] = useState("Evening");

    return (
        <div className="relative z-10 mx-auto mt-3 max-w-6xl px-3 sm:px-6 lg:-mt-11">
            <form
                onSubmit={(e) => e.preventDefault()}
                className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-line shadow-[0_24px_60px_-28px_rgb(11_59_44/0.45)] ring-1 ring-line lg:grid-cols-[1.1fr_1fr_1.5fr_auto]"
            >
                <Picker icon={MapPin} label="Ground" value={pitches[0] ? `${pitches[0].name}, ${pitches[0].format}` : "Any ground"} className="col-span-2 sm:col-span-1" />
                <Picker icon={CalendarDays} label="Date" value="Today, 11 Oct" className="col-span-2 sm:col-span-1" />

                <div className="col-span-2 bg-white px-5 py-3.5 lg:col-span-1">
                    <span className="text-xs font-medium text-ink-3">Time of day</span>
                    <div className="mt-1.5 flex gap-1 rounded-full bg-chalk p-1">
                        {TIMES.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTime(t)}
                                className={cn(
                                    "flex-1 rounded-full px-2 py-1.5 text-[13px] font-semibold transition-colors",
                                    time === t ? "bg-ink text-white" : "text-ink-3 hover:text-ink"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="col-span-2 flex items-center bg-white p-3 lg:col-span-1">
                    <Button type="submit" size="lg" className="w-full lg:h-full lg:rounded-[16px] lg:px-8">
                        <Search className="h-[18px] w-[18px]" />
                        Find free slots
                    </Button>
                </div>
            </form>
        </div>
    );
}

function Picker({ icon: Icon, label, value, className }) {
    return (
        <button
            type="button"
            className={cn("group flex items-center gap-3 bg-white px-5 py-4 text-left hover:bg-chalk/60", className)}
        >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-grass text-pitch">
                <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-ink-3">{label}</span>
                <span className="block truncate text-[15px] font-semibold text-ink">{value}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-ink-4 transition-transform group-hover:translate-y-0.5" />
        </button>
    );
}
