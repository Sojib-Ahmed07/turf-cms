// src/features/booking/components/MyBookingsClient.jsx
"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Hourglass } from "lucide-react";
import BookingTicket from "./BookingTicket";
import TicketDialog from "./TicketDialog";
import Button from "@/components/ui/Button";
import { cancelHeldBooking } from "@/features/booking/actions";
import { resendTicketEmail } from "@/features/booking/actions-email";
import { payForBooking } from "@/features/payment/actions";
import PayDialog from "@/features/payment/components/PayDialog";
import MethodOffDialog from "@/features/payment/components/MethodOffDialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";

const TABS = [
    { key: "upcoming", label: "myBookings.tabUpcoming", match: (b) => b.status === "confirmed" || b.status === "held" },
    { key: "past", label: "myBookings.tabPlayed", match: (b) => b.status === "completed" },
    { key: "cancelled", label: "myBookings.tabCancelled", match: (b) => b.status === "cancelled" || b.status === "expired" },
];

export default function MyBookingsClient({
    bookings = [],
    userName,
    highlightCode,
    payMethods = [],
    payFailed = false,
    playerName = "",
    venue = {},
}) {
    const router = useRouter();
    const { t, f } = useI18n();
    const paymentsLive = payMethods.length > 0;
    const enabledMethods = payMethods.filter((m) => m.enabled);
    const [tab, setTab] = useState("upcoming");
    const [payFor, setPayFor] = useState(null); // booking waiting for a method choice (PayDialog)
    const [payError, setPayError] = useState("");
    const closePay = useCallback(() => {
        setPayFor(null);
        setPayError("");
    }, []);
    const [offInfo, setOffInfo] = useState(null); // { off, alternatives, bookingId }: "this method is off" dialog
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(payFailed ? t("myBookings.payFailed") : "");
    const [flash, setFlash] = useState("");
    const [, startTransition] = useTransition();
    const [ticket, setTicket] = useState(null);
    const closeTicket = useCallback(() => setTicket(null), []);

    const current = TABS.find((x) => x.key === tab);
    const list = bookings.filter(current.match);
    const justHeld = highlightCode ? bookings.find((b) => b.id === highlightCode && b.status === "held") : null;

    function onCancel(bookingId) {
        setError("");
        setFlash("");
        setBusy({ id: bookingId, what: "cancel" });
        startTransition(async () => {
            const res = await cancelHeldBooking(bookingId);
            setBusy(null);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            router.refresh();
        });
    }

    /** Pay clicked on a held booking: pick a method first when more than one is set up. */
    function onPay(bookingId) {
        setError("");
        setFlash("");
        if (payMethods.length > 1) {
            setPayError("");
            setPayFor(bookings.find((b) => b.bookingId === bookingId) ?? null);
            return;
        }
        const only = payMethods[0];
        if (only && !only.enabled) {
            setOffInfo({ off: only, alternatives: [], bookingId });
            return;
        }
        pay(bookingId, only?.id ?? "");
    }

    function pay(bookingId, method) {
        setBusy({ id: bookingId, what: "pay" });
        startTransition(async () => {
            const res = await payForBooking(bookingId, method);
            if (res.ok) {
                window.location.assign(res.data.url);
                return;
            }
            setBusy(null);
            if (res.methodOff) {
                // The admin switched it off since the page loaded: say which method is on.
                setPayFor(null);
                setOffInfo({ off: res.off, alternatives: res.available ?? [], bookingId });
                return;
            }
            if (payFor) setPayError(res.error);
            else setError(res.error);
            if (res.expired) {
                setPayFor(null);
                setError(res.error);
                router.refresh();
            }
        });
    }

    function onEmail(booking) {
        setError("");
        setFlash("");
        setBusy({ id: booking.bookingId, what: "email" });
        startTransition(async () => {
            const res = await resendTicketEmail(booking.bookingId);
            setBusy(null);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setFlash(t("myBookings.receiptSent"));
        });
    }

    return (
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
            <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    {userName && <p className="text-[15px] text-ink-3">{t("myBookings.hi", { name: userName })}</p>}
                    <h1 className="display mt-1 text-[clamp(40px,6vw,72px)] text-ink">{t("myBookings.title")}</h1>
                </div>
                <Button href="/book" size="lg">
                    <CalendarPlus className="h-4 w-4" />
                    {t("myBookings.newBooking")}
                </Button>
            </header>

            {justHeld && (
                <div className="mt-8 flex items-start gap-3 rounded-card bg-flare-soft p-5 ring-1 ring-flare/50">
                    <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-flare-deep" />
                    <div>
                        <p className="text-[15px] font-semibold text-ink">{t("myBookings.openTitle", { pitch: justHeld.pitch })}</p>
                        <p className="mt-1 text-[13px] text-ink-2">
                            {t("myBookings.openBody")}
                            {paymentsLive && enabledMethods.length === 0 && t("myBookings.openPaused")}
                        </p>
                    </div>
                </div>
            )}

            {flash && <p className="mt-6 rounded-ctl bg-brand-soft px-4 py-3 text-[14px] font-medium text-brand-deep">{flash}</p>}
            {error && <p className="mt-6 rounded-ctl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">{error}</p>}

            <div role="tablist" className="mt-10 flex gap-1 border-b border-line">
                {TABS.map((tb) => {
                    const count = bookings.filter(tb.match).length;
                    const active = tb.key === tab;
                    return (
                        <button
                            key={tb.key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setTab(tb.key)}
                            className={cn(
                                "relative -mb-px flex items-center gap-2 px-4 pb-3 pt-2 text-[15px] font-semibold transition-colors",
                                active ? "text-ink" : "text-ink-3 hover:text-ink"
                            )}
                        >
                            {t(tb.label)}
                            <span className={cn("rounded-full px-2 py-0.5 text-[12px] tnum", active ? "bg-ink text-white" : "bg-ink/5 text-ink-3")}>
                                {f.digits(count)}
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
                            onPay={paymentsLive ? onPay : undefined}
                            onShow={setTicket}
                            onEmail={onEmail}
                            busy={busy?.id === b.bookingId ? busy.what : false}
                        />
                    ))
                ) : (
                    <div className="rounded-card border-2 border-dashed border-line px-6 py-16 text-center">
                        <p className="display text-[28px] text-ink">{t("myBookings.emptyTitle")}</p>
                        <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-3">
                            {tab === "upcoming" ? t("myBookings.emptyUpcoming") : t("myBookings.emptyPast")}
                        </p>
                        {tab === "upcoming" && (
                            <Button href="/book" className="mt-6">
                                {t("common.bookSlot")}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <TicketDialog booking={ticket} onClose={closeTicket} playerName={playerName} venue={venue} />
            {payMethods.length > 1 && (
                <PayDialog
                    open={Boolean(payFor)}
                    onClose={closePay}
                    methods={payMethods}
                    amount={payFor?.total ?? 0}
                    busy={busy?.what === "pay"}
                    error={payError}
                    onPay={(method) => payFor && pay(payFor.bookingId, method)}
                />
            )}
            <MethodOffDialog
                open={Boolean(offInfo)}
                onClose={() => setOffInfo(null)}
                off={offInfo?.off ?? null}
                alternatives={offInfo?.alternatives ?? []}
                onUse={(method) => {
                    const id = offInfo?.bookingId;
                    setOffInfo(null);
                    if (id) pay(id, method);
                }}
                busy={busy?.what === "pay"}
            />
        </div>
    );
}