// src/features/booking/components/BookingTicket.jsx
import { Hourglass, QrCode, RotateCcw } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn, taka, time12 } from "@/lib/utils";

const STATUS = {
    confirmed: { tone: "brand", label: "Confirmed" },
    held: { tone: "flare", label: "Awaiting payment" },
    completed: { tone: "neutral", label: "Played" },
    cancelled: { tone: "danger", label: "Cancelled" },
    expired: { tone: "neutral", label: "Expired" },
};

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * One booking drawn as a match ticket.
 * onCancel(bookingId): shown for held bookings. payHref: shown for held bookings once payments are live.
 */
export default function BookingTicket({ booking, onCancel, payHref, busy = false, highlight = false }) {
    const d = new Date(`${booking.date}T00:00:00`);
    const s = STATUS[booking.status] ?? STATUS.confirmed;
    const dim = booking.status === "cancelled" || booking.status === "completed";

    return (
        <article
            className={cn(
                "relative flex flex-col overflow-hidden rounded-card bg-white sm:flex-row",
                highlight ? "ring-2 ring-flare" : "ring-1 ring-line",
                dim && "opacity-80"
            )}
        >
            {/* Date stub */}
            <div
                className={cn(
                    "flex items-center gap-4 px-6 py-5 sm:w-[132px] sm:flex-col sm:justify-center sm:gap-0 sm:px-0",
                    dim ? "bg-chalk text-ink-2" : "bg-pitch text-white"
                )}
            >
                <span className={cn("text-[13px] font-medium", dim ? "text-ink-3" : "text-white/60")}>{DAY[d.getDay()]}</span>
                <span className="display text-[48px] leading-none tnum sm:mt-1">{d.getDate()}</span>
                <span className={cn("text-[13px] font-semibold sm:mt-1", dim ? "text-ink-3" : "text-white/80")}>
                    {MON[d.getMonth()]} {d.getFullYear()}
                </span>
            </div>

            {/* Perforation */}
            <div aria-hidden="true" className="relative hidden w-0 sm:block">
                <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
                <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
                <span className="absolute inset-y-5 left-0 border-l-2 border-dashed border-line" />
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={s.tone} dot>
                            {s.label}
                        </Badge>
                        <span className="text-[12px] font-semibold tracking-wide text-ink-4 tnum">{booking.id}</span>
                    </div>
                    <h3 className={cn("display mt-3 text-[28px] text-ink", booking.status === "cancelled" && "line-through decoration-2 decoration-ink-4")}>
                        {booking.pitch}
                    </h3>
                    <p className="mt-1 text-[15px] text-ink-2 tnum">
                        {time12(booking.start)} to {time12(booking.end)}
                        <span className="text-ink-4">, {booking.format}</span>
                    </p>
                    {booking.status === "held" && (
                        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-flare-deep">
                            <Hourglass className="h-3.5 w-3.5" />
                            {booking.holdMinutesLeft} min left to pay before the slot is released
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between gap-6 border-t border-dashed border-line pt-5 md:flex-col md:items-end md:border-0 md:pt-0">
                    <div className="md:text-right">
                        <p className="text-[20px] font-bold text-ink tnum">{taka(booking.total)}</p>
                        <p className="text-[12px] text-ink-3">
                            {booking.paidWith ? `Paid with ${booking.paidWith}` : booking.status === "held" ? "Not paid yet" : "No charge"}
                            {booking.discount > 0 && `, saved ${taka(booking.discount)}`}
                        </p>
                    </div>
                    {booking.status === "confirmed" && (
                        <Button variant="ink" size="sm">
                            <QrCode className="h-4 w-4" />
                            Show ticket
                        </Button>
                    )}
                    {booking.status === "held" && (
                        <div className="flex gap-2">
                            {onCancel && (
                                <Button variant="ghost" size="sm" disabled={busy} onClick={() => onCancel(booking.bookingId)}>
                                    {busy ? "Cancelling…" : "Cancel"}
                                </Button>
                            )}
                            {payHref && (
                                <Button href={payHref} variant="flare" size="sm">
                                    Pay {taka(booking.total)}
                                </Button>
                            )}
                        </div>
                    )}
                    {(booking.status === "completed" || booking.status === "cancelled") && (
                        <Button href="/book" variant="outline" size="sm">
                            <RotateCcw className="h-3.5 w-3.5" />
                            Book again
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}