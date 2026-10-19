// src/components/site/VerifyTicket.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { markTicketUsed } from "@/features/admin/actions/checkin";
import { cn, taka } from "@/lib/utils";

const TONE = {
    valid: { bg: "bg-brand-soft", ring: "ring-brand/50", icon: CheckCircle2, iconClass: "text-brand-deep", title: "This ticket is valid", subtitle: "TurfZone confirms this is a real, paid booking." },
    cancelled: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: "Cancelled", subtitle: "This booking was cancelled, so it's not a valid ticket." },
    expired: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: "Expired", subtitle: "The slot was released before the booking was confirmed." },
    unpaid: { bg: "bg-flare-soft", ring: "ring-flare/50", icon: AlertTriangle, iconClass: "text-flare-deep", title: "Not paid", subtitle: "The slot is reserved, but the payment isn't done yet." },
    refunded: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: "Refunded", subtitle: "This booking was refunded, so it's not valid any more." },
    played: { bg: "bg-chalk", ring: "ring-line", icon: Clock, iconClass: "text-ink-3", title: "Played", subtitle: "This ticket is real, but the match time has already passed." },
    invalid: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: "Not a TurfZone ticket", subtitle: "This QR wasn't issued by TurfZone, or it was tampered with." },
    not_found: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: "Booking not found", subtitle: "The ticket is signed but the booking no longer exists." },
};

function formatTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });
}

export default function VerifyTicket({ state, booking, canCheckIn = false }) {
    const router = useRouter();
    const tone = TONE[state] ?? TONE.invalid;
    const Icon = tone.icon;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [, startTransition] = useTransition();

    function markUsed() {
        if (!booking) return;
        setError("");
        setBusy(true);
        startTransition(async () => {
            const res = await markTicketUsed({ bookingId: booking.id });
            setBusy(false);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            router.refresh();
        });
    }

    return (
        <div className="space-y-5">
            <div className={cn("rounded-card p-6 ring-1", tone.bg, tone.ring)}>
                <div className="flex items-start gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white">
                        <Icon className={cn("h-6 w-6", tone.iconClass)} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="display text-[26px] text-ink">{tone.title}</h1>
                        <p className="mt-1 text-[14px] text-ink-2">{tone.subtitle}</p>
                    </div>
                </div>
            </div>

            {booking && (
                <div className="rounded-card bg-white p-6 ring-1 ring-line">
                    <div className="space-y-3 text-[14px]">
                        <Row label="Booking" value={booking.code} mono />
                        <Row label="Ground" value={booking.pitch} />
                        <Row label="Date" value={booking.playDateLabel} note={booking.nightOf ? `Night of ${booking.nightOf}` : null} />
                        <Row label="Time" value={booking.timeLabel} />
                        <Row label="Player" value={booking.player} />
                        <Row label="Amount" value={taka(booking.total) + (booking.discount > 0 ? ` (saved ${taka(booking.discount)})` : "")} />
                        {booking.checkedInAt && <Row label="Checked in" value={formatTime(booking.checkedInAt)} />}
                    </div>

                    {error && <p className="mt-4 rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}

                    {canCheckIn && (
                        <Button className="mt-5 w-full" variant="ink" onClick={markUsed} disabled={busy}>
                            {busy ? "Marking…" : "Mark as used"}
                        </Button>
                    )}
                </div>
            )}

            <p className="text-center text-[12px] text-ink-4">
                Issued by TurfZone. Every ticket is signed, so the code on this page is proof.
            </p>
        </div>
    );
}

function Row({ label, value, note, mono = false }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
            <p className="text-[13px] text-ink-3">{label}</p>
            <div className="text-right">
                <p className={cn("text-[14px] font-semibold text-ink", mono && "tnum")}>{value}</p>
                {note && <p className="text-[12px] text-ink-3">{note}</p>}
            </div>
        </div>
    );
}