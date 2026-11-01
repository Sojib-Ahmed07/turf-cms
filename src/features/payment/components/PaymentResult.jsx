// src/features/payment/components/PaymentResult.jsx
import { Check, CalendarPlus, Hourglass, Loader2, X, Minus, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import PitchLines from "@/components/site/PitchLines";
import RetryPayButton from "./RetryPayButton";
import { calendarUrl, playDate } from "@/features/booking/calendar";
import { cn } from "@/lib/utils";
import { getI18n } from "@/i18n/server";

// Texts live in the dictionaries under result.<status>Title / result.<status>Body.
const COPY = {
    success: { icon: Check, ring: "bg-brand text-white" },
    pending: { icon: Loader2, ring: "bg-flare text-ink" },
    failed: { icon: X, ring: "bg-danger text-white" },
    cancelled: { icon: Minus, ring: "bg-ink-3 text-white" },
    refund: { icon: RotateCcw, ring: "bg-flare text-ink" },
    missing: { icon: Minus, ring: "bg-ink-3 text-white" },
};

/**
 * status: "success" | "pending" | "failed" | "cancelled" | "refund" | "missing"
 * booking: from getPaymentResult().booking (null for "missing")
 * canRetry: unpaid and not started yet, show "Try payment again" (locks the slot again if it's still free)
 * deskPhone: venue phone from site settings
 * payMethods: [{ id, label, hint }] for "Try payment again"
 */
export default async function PaymentResult({ status = "success", booking = null, canRetry = false, deskPhone = "", payMethods = [] }) {
    const { t, f } = await getI18n();
    const key = COPY[status] ? status : "missing";
    const c = COPY[key];
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
                    <h1 className={cn("display relative mt-6 text-[clamp(34px,6vw,46px)]", !dark && "text-ink")}>{t(`result.${key}Title`)}</h1>
                    <p className={cn("relative mx-auto mt-3 max-w-[40ch] text-[15px] leading-relaxed", dark ? "text-white/70" : "text-ink-3")}>{t(`result.${key}Body`)}</p>
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
                                <Item label={t("result.ground")} value={booking.pitch} />
                                <Item label={t("result.date")} value={f.date(playDate(booking))} />
                                <Item label={t("result.time")} value={t("ticket.timeRange", { from: f.time(booking.start), to: f.time(booking.end) })} />
                                <Item label={t("result.bookingId")} value={booking.id} />
                                {(status === "success" || status === "refund") && (
                                    <>
                                        <Item
                                            label={t("result.paid")}
                                            value={booking.paidWith ? t("result.paidWith", { amount: f.taka(booking.total), method: booking.paidWith }) : f.taka(booking.total)}
                                        />
                                        {booking.trxId && <Item label={t("result.transaction")} value={booking.trxId} />}
                                    </>
                                )}
                                {status !== "success" && status !== "refund" && <Item label={t("result.amount")} value={f.taka(booking.total)} />}
                            </dl>

                            {canRetry && (status === "failed" || status === "cancelled") && (
                                <p className="mt-6 flex items-center gap-2 rounded-ctl bg-flare-soft px-4 py-3 text-[14px] font-medium text-flare-deep">
                                    <Hourglass className="h-4 w-4 shrink-0" />
                                    {t("result.slotFree")}
                                </p>
                            )}

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                {status === "success" && (
                                    <>
                                        <Button href="/bookings" variant="ink" size="lg" className="w-full sm:w-auto sm:flex-1">
                                            {t("result.viewBookings")}
                                        </Button>
                                        <Button href={calendarUrl(booking)} variant="outline" size="lg" className="w-full sm:w-auto sm:flex-1" target="_blank" rel="noreferrer">
                                            <CalendarPlus className="h-4 w-4" />
                                            {t("ticket.addCalendar")}
                                        </Button>
                                    </>
                                )}
                                {status === "pending" && (
                                    <Button href="/bookings" variant="ink" size="lg" className="w-full sm:w-auto sm:flex-1">
                                        {t("result.checkBookings")}
                                    </Button>
                                )}
                                {(status === "failed" || status === "cancelled") && (
                                    <>
                                        {canRetry && (
                                            <RetryPayButton
                                                bookingId={booking.bookingId}
                                                methods={payMethods}
                                                amount={booking.total}
                                                className="w-full sm:w-auto sm:flex-1"
                                            />
                                        )}
                                        <Button href="/book" variant={canRetry ? "outline" : "brand"} size="lg" className="w-full sm:w-auto sm:flex-1">
                                            {t("result.pickAnother")}
                                        </Button>
                                    </>
                                )}
                                {status === "refund" && (
                                    <Button href="/book" size="lg" className="w-full sm:w-auto sm:flex-1">
                                        {t("result.pickAnother")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {!booking && (
                    <div className="p-8">
                        <Button href="/bookings" variant="ink" size="lg" className="w-full">
                            {t("result.goBookings")}
                        </Button>
                    </div>
                )}
            </div>
            {deskPhone && (
                <p className="mt-6 text-center text-[13px] text-ink-3">
                    {t("result.questions", { phone: "\u0000" })
                        .split("\u0000")
                        .map((part, i) =>
                            i === 0 ? (
                                part
                            ) : (
                                <span key={i}>
                                    <a href={`tel:${deskPhone.replace(/[^\d+]/g, "")}`} className="font-semibold text-ink hover:underline">
                                        {deskPhone}
                                    </a>
                                    {part}
                                </span>
                            )
                        )}
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