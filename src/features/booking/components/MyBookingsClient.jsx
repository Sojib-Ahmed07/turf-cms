// src/features/booking/components/MyBookingsClient.jsx
"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import BookingTicket from "./BookingTicket";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const TABS = [
    { key: "upcoming", label: "Upcoming", match: (b) => b.status === "confirmed" || b.status === "held" },
    { key: "past", label: "Played", match: (b) => b.status === "completed" },
    { key: "cancelled", label: "Cancelled", match: (b) => b.status === "cancelled" || b.status === "expired" },
];

export default function MyBookingsClient({ bookings = [], userName }) {
    const [tab, setTab] = useState("upcoming");
    const current = TABS.find((t) => t.key === tab);
    const list = bookings.filter(current.match);

    return (
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
            <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    {userName && <p className="text-[15px] text-ink-3">Hi {userName},</p>}
                    <h1 className="display mt-1 text-[clamp(40px,6vw,72px)] text-ink">My bookings</h1>
                </div>
                <Button href="/book" size="lg">
                    <CalendarPlus className="h-4 w-4" />
                    New booking
                </Button>
            </header>

            <div role="tablist" className="mt-10 flex gap-1 border-b border-line">
                {TABS.map((t) => {
                    const count = bookings.filter(t.match).length;
                    const active = t.key === tab;
                    return (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                "relative -mb-px flex items-center gap-2 px-4 pb-3 pt-2 text-[15px] font-semibold transition-colors",
                                active ? "text-ink" : "text-ink-3 hover:text-ink"
                            )}
                        >
                            {t.label}
                            <span className={cn("rounded-full px-2 py-0.5 text-[12px] tnum", active ? "bg-ink text-white" : "bg-ink/5 text-ink-3")}>{count}</span>
                            {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-brand" />}
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 space-y-4">
                {list.length ? (
                    list.map((b) => <BookingTicket key={b.id} booking={b} />)
                ) : (
                    <div className="rounded-card border-2 border-dashed border-line px-6 py-16 text-center">
                        <p className="display text-[28px] text-ink">Nothing here yet</p>
                        <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-3">
                            {tab === "upcoming" ? "Book a slot and your ticket will show up here." : "Bookings move here after match day."}
                        </p>
                        {tab === "upcoming" && (
                            <Button href="/book" className="mt-6">
                                Book a slot
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
