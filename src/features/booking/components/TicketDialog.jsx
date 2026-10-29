// src/features/booking/components/TicketDialog.jsx
"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, MapPin, X } from "lucide-react";
import Button from "@/components/ui/Button";
import PitchLines from "@/components/site/PitchLines";
import { calendarUrl, isAfterMidnight, playDate } from "@/features/booking/calendar";
import { useI18n } from "@/i18n/I18nProvider";

export default function TicketDialog({ booking, onClose, playerName = "", venue = {} }) {
    const { t } = useI18n();
    const open = Boolean(booking);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && onClose?.();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("ticket.dialogLabel", { code: booking.id })}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ y: 40, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="max-h-[94svh] w-full overflow-y-auto sm:max-w-[420px]"
                    >
                        <Ticket booking={booking} playerName={playerName} venue={venue} onClose={onClose} />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Ticket({ booking: b, playerName, venue, onClose }) {
    const { t, f } = useI18n();
    const late = isAfterMidnight(b);
    const amount = f.taka(b.total);
    const paid = b.paidWith
        ? b.paidWith === "Online"
            ? t("ticket.paidOnlineAmount", { amount })
            : t("ticket.paidWithAmount", { amount, method: b.paidWith })
        : b.total > 0
            ? amount
            : t("ticket.noCharge");

    return (
        <div className="overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]">
            <div className="relative overflow-hidden bg-pitch px-7 pb-8 pt-6 text-white">
                <PitchLines className="absolute -right-24 -top-10 h-72 w-72 text-white/[0.07]" />
                <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-white/70">{venue.name || t("ticket.matchTicket")}</p>
                        <p className="text-[12px] text-white/45">{t("ticket.matchTicket")}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("ticket.close")}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="relative mt-8 text-[12px] font-medium text-white/50">{t("ticket.code")}</p>
                <p className="display relative mt-1 break-all text-[44px] leading-none tracking-wide tnum sm:text-[48px]">{b.id}</p>

                <div className="relative mt-7 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <p className="display truncate text-[28px] leading-tight">{b.pitch}</p>
                        {b.format && <p className="text-[14px] text-white/60">{b.format}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-brand px-3 py-1 text-[12px] font-bold text-brand-ink">{t("ticket.confirmed")}</span>
                </div>
            </div>

            <div aria-hidden="true" className="relative h-0">
                <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-line" />
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-7 pb-2 pt-8">
                <Row label={t("ticket.date")} value={f.dateLong(playDate(b))} wide note={late ? t("ticket.nightOf", { date: f.date(b.date) }) : null} />
                <Row label={t("ticket.time")} value={t("ticket.timeRange", { from: f.time(b.start), to: f.time(b.end) })} />
                <Row label={t("ticket.player")} value={playerName || t("ticket.you")} />
                <Row label={t("ticket.payment")} value={paid} note={b.discount > 0 ? t("ticket.savedAmount", { amount: f.taka(b.discount) }) : null} wide />
            </dl>

            {b.qrDataUrl && (
                <div className="mt-3 border-t-2 border-dashed border-line px-7 pt-6 text-center">
                    <p className="text-[12px] font-medium text-ink-3">{t("ticket.showAtGate")}</p>
                    <img
                        src={b.qrDataUrl}
                        alt={t("ticket.qrAlt", { code: b.id })}
                        width={200}
                        height={200}
                        className="mx-auto mt-2 h-[200px] w-[200px]"
                    />
                </div>
            )}

            <div className="px-7 pb-7 pt-5">
                {venue.address && (
                    <p className="flex items-start gap-2 text-[13px] text-ink-3">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {venue.address}
                    </p>
                )}
                <p className="mt-4 rounded-ctl bg-chalk px-4 py-3 text-[14px] font-medium text-ink-2">
                    {t("ticket.deskNote")}
                </p>
                <div className="mt-5 flex gap-2">
                    <Button href={calendarUrl(b)} target="_blank" rel="noreferrer" variant="outline" className="flex-1">
                        <CalendarPlus className="h-4 w-4" />
                        {t("ticket.addCalendar")}
                    </Button>
                    <Button variant="ink" className="flex-1" onClick={onClose}>
                        {t("ticket.done")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, note, wide = false }) {
    return (
        <div className={wide ? "col-span-2" : undefined}>
            <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
            <dd className="mt-1 text-[16px] font-semibold text-ink tnum">{value}</dd>
            {note && <dd className="text-[12px] text-ink-3">{note}</dd>}
        </div>
    );
}