// src/features/booking/components/BookingTicket.jsx
"use client";

import { Hourglass, Mail, RotateCcw, Ticket } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { isAfterMidnight, playDate } from "@/features/booking/calendar";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";

const STATUS = {
    confirmed: { tone: "brand", label: "ticket.confirmed" },
    held: { tone: "flare", label: "ticket.held" },
    completed: { tone: "neutral", label: "ticket.played" },
    cancelled: { tone: "danger", label: "ticket.cancelled" },
    expired: { tone: "neutral", label: "ticket.expired" },
};

/** Paid line under the price: "Paid online", "Paid with bKash", ... */
function paidNote(b, t, f) {
    let note;
    if (b.refundDue) note = t("ticket.refundDue");
    else if (b.refunded) note = t("ticket.refunded");
    else if (b.paidWith) note = b.paidWith === "Online" ? t("ticket.paidOnline") : t("ticket.paidWith", { method: b.paidWith });
    else note = b.status === "held" ? t("ticket.notPaid") : t("ticket.noCharge");
    return b.discount > 0 ? note + t("ticket.saved", { amount: f.taka(b.discount) }) : note;
}

export default function BookingTicket({ booking, onCancel, onPay, onShow, onEmail, payHref, busy = false, highlight = false }) {
    const { t, f } = useI18n();
    const [y, m, day] = playDate(booking).split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
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
                <span className={cn("text-[13px] font-medium", dim ? "text-ink-3" : "text-white/60")}>{f.dayShort(dow)}</span>
                <span className="display text-[48px] leading-none tnum sm:mt-1">{f.digits(day)}</span>
                <span className={cn("text-[13px] font-semibold sm:mt-1", dim ? "text-ink-3" : "text-white/80")}>
                    {f.monthShort(m)} {f.digits(y)}
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
                            {t(s.label)}
                        </Badge>
                        <span className="text-[12px] font-semibold tracking-wide text-ink-4 tnum">{booking.id}</span>
                    </div>
                    <h3 className={cn("display mt-3 text-[28px] text-ink", booking.status === "cancelled" && "line-through decoration-2 decoration-ink-4")}>
                        {booking.pitch}
                    </h3>
                    <p className="mt-1 text-[15px] text-ink-2 tnum">
                        {t("ticket.timeRange", { from: f.time(booking.start), to: f.time(booking.end) })}
                        <span className="text-ink-4">
                            {booking.people ? `, ${t("summary.peopleValue", { n: booking.people })}` : booking.format && `, ${booking.format}`}
                            {late && `, ${t("ticket.afterMidnight")}`}
                        </span>
                    </p>
                    {booking.status === "held" && (
                        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-flare-deep">
                            <Hourglass className="h-3.5 w-3.5" />
                            {t("ticket.heldNote", { minutes: booking.holdMinutesLeft })}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between gap-6 border-t border-dashed border-line pt-5 md:flex-col md:items-end md:border-0 md:pt-0">
                    <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-1">
                        <div className="md:text-right">
                            <p className="text-[20px] font-bold text-ink tnum">{f.taka(booking.total)}</p>
                            <p className="text-[12px] text-ink-3">{paidNote(booking, t, f)}</p>
                        </div>
                        {booking.status === "confirmed" && booking.qrDataUrl && (
                            <img
                                src={booking.qrDataUrl}
                                alt={t("ticket.qrAlt", { code: booking.id })}
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
                                    {t("ticket.show")}
                                </Button>
                            )}
                            {onEmail && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={Boolean(busy)}
                                    onClick={() => onEmail(booking)}
                                    aria-label={t("ticket.emailAria")}
                                >
                                    <Mail className="h-3.5 w-3.5" />
                                    {busy === "email" ? t("ticket.sending") : t("ticket.email")}
                                </Button>
                            )}
                        </div>
                    )}
                    {booking.status === "held" && (
                        <div className="flex gap-2">
                            {onCancel && (
                                <Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => onCancel(booking.bookingId)}>
                                    {busy === "cancel" || busy === true ? t("ticket.releasing") : t("ticket.release")}
                                </Button>
                            )}
                            {onPay && (
                                <Button variant="flare" size="sm" disabled={Boolean(busy)} onClick={() => onPay(booking.bookingId)}>
                                    {busy === "pay" ? t("ticket.opening") : t("ticket.pay", { amount: f.taka(booking.total) })}
                                </Button>
                            )}
                            {!onPay && payHref && (
                                <Button href={payHref} variant="flare" size="sm">
                                    {t("ticket.pay", { amount: f.taka(booking.total) })}
                                </Button>
                            )}
                        </div>
                    )}
                    {(booking.status === "completed" || booking.status === "cancelled") && (
                        <Button href="/book" variant="outline" size="sm">
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t("ticket.bookAgain")}
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}