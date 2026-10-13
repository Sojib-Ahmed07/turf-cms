// src/features/payment/components/PaymentResult.jsx
import { Check, CalendarPlus, Hourglass, Loader2, X, Minus, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import PitchLines from "@/components/site/PitchLines";
import RetryPayButton from "./RetryPayButton";
import { addDaysISO, hhmmToMinutes, DAY_START_HOUR, shortDateLabel } from "@/lib/time";
import { cn, taka, time12 } from "@/lib/utils";

const COPY = {
    success: {
        icon: Check,
        ring: "bg-brand text-white",
        title: "You're booked",
        body: "Your ticket is in My bookings. Show it at the gate on match day.",
    },
    pending: {
        icon: Loader2,
        ring: "bg-flare text-ink",
        title: "Confirming your payment",
        body: "We're waiting for the payment gateway to confirm. This usually takes a minute. Refresh this page, or check My bookings shortly.",
    },
    failed: {
        icon: X,
        ring: "bg-danger text-white",
        title: "Payment didn't go through",
        body: "Your bank or wallet didn't complete the payment. No money was taken.",
    },
    cancelled: {
        icon: Minus,
        ring: "bg-ink-3 text-white",
        title: "Payment cancelled",
        body: "You left the payment page before paying. No money was taken.",
    },
    refund: {
        icon: RotateCcw,
        ring: "bg-flare text-ink",
        title: "Paid, but the slot was gone",
        body: "Your payment arrived after the slot was released, so we couldn't confirm it. The full amount will be refunded to you. The desk will contact you.",
    },
    missing: {
        icon: Minus,
        ring: "bg-ink-3 text-white",
        title: "Payment not found",
        body: "We couldn't find this payment. Your bookings and their payment status are in My bookings.",
    },
};

/**
 * status: "success" | "pending" | "failed" | "cancelled" | "refund" | "missing"
 * booking: from getPaymentResult().booking (null for "missing")
 * canRetry: the slot is still held, show "Try payment again"
 * deskPhone: venue phone from site settings
 */
export default function PaymentResult({ status = "success", booking = null, canRetry = false, deskPhone = "" }) {
    const c = COPY[status] ?? COPY.missing;
    const Icon = c.icon;
    const dark = status === "success";

    return (
        <div className="mx-auto max-w-xl px-4 pb-24 pt-10 sm:pt-16">
            <div className="overflow-hidden rounded-frame bg-white ring-1 ring-line">
                {/* Head */}
                <div className={cn("relative overflow-hidden px-8 pb-10 pt-12 text-center", dark ? "bg-pitch text-white" : "bg-chalk")}>
                    {dark && <PitchLines className="absolute inset-0 h-full w-full text-white/10" />}
                    <span className={cn("relative mx-auto grid h-16 w-16 place-items-center rounded-full ring-8", c.ring, dark ? "ring-white/10" : "ring-white")}>
                        <Icon className={cn("h-7 w-7", status === "pending" && "animate-spin")} strokeWidth={3} />
                    </span>
                    <h1 className={cn("display relative mt-6 text-[clamp(34px,6vw,46px)]", !dark && "text-ink")}>{c.title}</h1>
                    <p className={cn("relative mx-auto mt-3 max-w-[40ch] text-[15px] leading-relaxed", dark ? "text-white/70" : "text-ink-3")}>{c.body}</p>
                </div>

                {booking && (
                    <>
                        {/* Perforation */}
                        <div aria-hidden="true" className="relative h-0">
                            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
                            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
                            <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-line" />
                        </div>

                        <div className="p-8">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                                <Item label="Ground" value={booking.pitch} />
                                <Item label="Date" value={shortDateLabel(booking.date)} />
                                <Item label="Time" value={`${time12(booking.start)} to ${time12(booking.end)}`} />
                                <Item label="Booking ID" value={booking.id} />
                                {(status === "success" || status === "refund") && (
                                    <>
                                        <Item label="Paid" value={`${taka(booking.total)} with ${booking.paidWith}`} />
                                        {booking.trxId && <Item label="Transaction" value={booking.trxId} />}
                                    </>
                                )}
                                {status !== "success" && status !== "refund" && <Item label="Amount" value={taka(booking.total)} />}
                            </dl>

                            {canRetry && (status === "failed" || status === "cancelled") && (
                                <p className="mt-6 flex items-center gap-2 rounded-ctl bg-flare-soft px-4 py-3 text-[14px] font-medium text-flare-deep">
                                    <Hourglass className="h-4 w-4 shrink-0" />
                                    We're still holding this slot for {booking.holdMinutesLeft} {booking.holdMinutesLeft === 1 ? "minute" : "minutes"}.
                                </p>
                            )}

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                {status === "success" && (
                                    <>
                                        <Button href="/bookings" variant="ink" size="lg" className="w-full sm:w-auto sm:flex-1">
                                            View my bookings
                                        </Button>
                                        <Button href={calendarUrl(booking)} variant="outline" size="lg" className="w-full sm:w-auto sm:flex-1" target="_blank" rel="noreferrer">
                                            <CalendarPlus className="h-4 w-4" />
                                            Add to calendar
                                        </Button>
                                    </>
                                )}
                                {status === "pending" && (
                                    <Button href="/bookings" variant="ink" size="lg" className="w-full sm:w-auto sm:flex-1">
                                        Check my bookings
                                    </Button>
                                )}
                                {(status === "failed" || status === "cancelled") && (
                                    <>
                                        {canRetry && <RetryPayButton bookingId={booking.bookingId} className="w-full sm:w-auto sm:flex-1" />}
                                        <Button href="/book" variant={canRetry ? "outline" : "brand"} size="lg" className="w-full sm:w-auto sm:flex-1">
                                            Pick another slot
                                        </Button>
                                    </>
                                )}
                                {status === "refund" && (
                                    <Button href="/book" size="lg" className="w-full sm:w-auto sm:flex-1">
                                        Pick another slot
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {!booking && (
                    <div className="p-8">
                        <Button href="/bookings" variant="ink" size="lg" className="w-full">
                            Go to my bookings
                        </Button>
                    </div>
                )}
            </div>
            {deskPhone && (
                <p className="mt-6 text-center text-[13px] text-ink-3">
                    Questions about a payment? Call the desk on{" "}
                    <a href={`tel:${deskPhone.replace(/[^\d+]/g, "")}`} className="font-semibold text-ink hover:underline">
                        {deskPhone}
                    </a>
                    .
                </p>
            )}
        </div>
    );
}

function Item({ label, value }) {
    return (
        <div>
            <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
            <dd className="mt-1 text-[15px] font-semibold text-ink tnum">{value}</dd>
        </div>
    );
}

/** Google Calendar "add event" link. Slots before 6 am are played after midnight, on the next calendar day. */
function calendarUrl(b) {
    const stamp = (time) => {
        const day = hhmmToMinutes(time) < DAY_START_HOUR * 60 ? addDaysISO(b.date, 1) : b.date;
        return `${day.replaceAll("-", "")}T${time.replace(":", "")}00`;
    };
    const q = new URLSearchParams({
        action: "TEMPLATE",
        text: `${b.pitch} booking (${b.id})`,
        dates: `${stamp(b.start)}/${stamp(b.end)}`,
        ctz: "Asia/Dhaka",
        details: `Booking ${b.id}. Show your ticket at the gate.`,
    });
    return `https://calendar.google.com/calendar/render?${q}`;
}