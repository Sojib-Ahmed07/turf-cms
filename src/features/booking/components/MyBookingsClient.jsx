// src/features/booking/components/MyBookingsClient.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Hourglass } from "lucide-react";
import BookingTicket from "./BookingTicket";
import Button from "@/components/ui/Button";
import { cancelHeldBooking } from "@/features/booking/actions";
import { cn } from "@/lib/utils";

const TABS = [
    { key: "upcoming", label: "Upcoming", match: (b) => b.status === "confirmed" || b.status === "held" },
    { key: "past", label: "Played", match: (b) => b.status === "completed" },
    { key: "cancelled", label: "Cancelled", match: (b) => b.status === "cancelled" || b.status === "expired" },
];

/**
 * props:
 *   bookings     from getMyBookings(userId)
 *   userName     first name for the greeting
 *   highlightCode booking code from ?held= (just reserved)
 *   paymentsLive  false until Step 2; hides the Pay button
 */
export default function MyBookingsClient({ bookings = [], userName, highlightCode, paymentsLive = false }) {
    const router = useRouter();
    const [tab, setTab] = useState("upcoming");
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");
    const [, startTransition] = useTransition();

    const current = TABS.find((t) => t.key === tab);
    const list = bookings.filter(current.match);
    const justHeld = highlightCode ? bookings.find((b) => b.id === highlightCode && b.status === "held") : null;

    function onCancel(bookingId) {
        setError("");
        setBusyId(bookingId);
        startTransition(async () => {
            const res = await cancelHeldBooking(bookingId);
            setBusyId(null);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            router.refresh();
        });
    }

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

            {justHeld && (
                <div className="mt-8 flex items-start gap-3 rounded-card bg-flare-soft p-5 ring-1 ring-flare/50">
                    <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-flare-deep" />
                    <div>
                        <p className="text-[15px] font-semibold text-ink">
                            {justHeld.pitch} is reserved for you for {justHeld.holdMinutesLeft} minutes
                        </p>
                        <p className="mt-1 text-[13px] text-ink-2">
                            {paymentsLive
                                ? "Pay before the time runs out to confirm the booking."
                                : "Online payment is being set up. Call the desk to confirm, or cancel if you changed your mind."}
                        </p>
                    </div>
                </div>
            )}

            {error && <p className="mt-6 rounded-ctl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">{error}</p>}

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
                            <span className={cn("rounded-full px-2 py-0.5 text-[12px] tnum", active ? "bg-ink text-white" : "bg-ink/5 text-ink-3")}>
                                {count}
                            </span>
                            {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-brand" />}
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 space-y-4">
                {list.length ? (
                    list.map((b) => (
                        <BookingTicket
                            key={b.bookingId}
                            booking={b}
                            highlight={b.id === highlightCode}
                            onCancel={onCancel}
                            busy={busyId === b.bookingId}
                            payHref={paymentsLive ? `/payment/start?b=${b.bookingId}` : undefined}
                        />
                    ))
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