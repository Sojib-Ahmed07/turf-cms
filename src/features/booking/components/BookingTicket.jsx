// src/features/booking/components/BookingTicket.jsx
import { Hourglass, Mail, RotateCcw, Ticket } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { isAfterMidnight, playDate } from "@/features/booking/calendar";
import { cn, taka, time12 } from "@/lib/utils";

const STATUS = {
    confirmed: { tone: "brand", label: "Confirmed" },
    held: { tone: "flare", label: "Payment open" },
    completed: { tone: "neutral", label: "Played" },
    cancelled: { tone: "danger", label: "Cancelled" },
    expired: { tone: "neutral", label: "Expired" },
};

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BookingTicket({ booking, onCancel, onPay, onShow, onEmail, payHref, busy = false, highlight = false }) {
    const [y, m, day] = playDate(booking).split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, day));
    const late = isAfterMidnight(booking);
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
            <div
                className={cn(
                    "flex items-center gap-4 px-6 py-5 sm:w-[132px] sm:flex-col sm:justify-center sm:gap-0 sm:px-0",
                    dim ? "bg-chalk text-ink-2" : "bg-pitch text-white"
                )}
            >
                <span className={cn("text-[13px] font-medium", dim ? "text-ink-3" : "text-white/60")}>{DAY[d.getUTCDay()]}</span>
                <span className="display text-[48px] leading-none tnum sm:mt-1">{d.getUTCDate()}</span>
                <span className={cn("text-[13px] font-semibold sm:mt-1", dim ? "text-ink-3" : "text-white/80")}>
                    {MON[d.getUTCMonth()]} {d.getUTCFullYear()}
                </span>
            </div>

            <div aria-hidden="true" className="relative hidden w-0 sm:block">
                <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
                <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
                <span className="absolute inset-y-5 left-0 border-l-2 border-dashed border-line" />
            </div>

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
                        <span className="text-ink-4">
                            , {booking.format}
                            {late && ", after midnight"}
                        </span>
                    </p>
                    {booking.status === "held" && (
                        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-flare-deep">
                            <Hourglass className="h-3.5 w-3.5" />
                            Payment page open. The slot is kept for you for {booking.holdMinutesLeft} more min at most
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between gap-6 border-t border-dashed border-line pt-5 md:flex-col md:items-end md:border-0 md:pt-0">
                    <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-1">
                        <div className="md:text-right">
                            <p className="text-[20px] font-bold text-ink tnum">{taka(booking.total)}</p>
                            <p className="text-[12px] text-ink-3">
                                {booking.refundDue
                                    ? "Paid, refund on the way"
                                    : booking.refunded
                                        ? "Refunded"
                                        : booking.paidWith
                                            ? booking.paidWith === "Online"
                                                ? "Paid online"
                                                : `Paid with ${booking.paidWith}`
                                            : booking.status === "held"
                                                ? "Not paid yet"
                                                : "No charge"}
                                {booking.discount > 0 && `, saved ${taka(booking.discount)}`}
                            </p>
                        </div>
                        {booking.status === "confirmed" && booking.qrDataUrl && (
                            <img
                                src={booking.qrDataUrl}
                                alt={`QR for ${booking.id}`}
                                width={72}
                                height={72}
                                className="h-[72px] w-[72px] shrink-0 rounded-ctl ring-1 ring-line"
                            />
                        )}
                    </div>

                    {booking.status === "confirmed" && (
                        <div className="flex gap-2">
                            {onShow && (
                                <Button variant="ink" size="sm" onClick={() => onShow(booking)}>
                                    <Ticket className="h-4 w-4" />
                                    Show ticket
                                </Button>
                            )}
                            {onEmail && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={Boolean(busy)}
                                    onClick={() => onEmail(booking)}
                                    aria-label="Email me the receipt"
                                >
                                    <Mail className="h-3.5 w-3.5" />
                                    {busy === "email" ? "Sending…" : "Email receipt"}
                                </Button>
                            )}
                        </div>
                    )}
                    {booking.status === "held" && (
                        <div className="flex gap-2">
                            {onCancel && (
                                <Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => onCancel(booking.bookingId)}>
                                    {busy === "cancel" || busy === true ? "Releasing…" : "Release slot"}
                                </Button>
                            )}
                            {onPay && (
                                <Button variant="flare" size="sm" disabled={Boolean(busy)} onClick={() => onPay(booking.bookingId)}>
                                    {busy === "pay" ? "Opening payment…" : `Pay ${taka(booking.total)}`}
                                </Button>
                            )}
                            {!onPay && payHref && (
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