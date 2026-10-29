// src/components/site/VerifyTicket.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { markTicketUsed } from "@/features/admin/actions/checkin";
import { cn, taka } from "@/lib/utils";

const toneFor = (site) => ({
    valid: { bg: "bg-brand-soft", ring: "ring-brand/50", icon: CheckCircle2, iconClass: "text-brand-deep", title: "টিকিটটি সঠিক", subtitle: `${site} নিশ্চিত করছে যে এটি পেমেন্ট করা আসল বুকিং।` },
    cancelled: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: "ক্যানসেল হয়েছে", subtitle: "বুকিংটি ক্যানসেল হয়েছে, তাই টিকিটটি আর চলবে না।" },
    expired: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: "মেয়াদ শেষ", subtitle: "বুকিং কনফার্মড হওয়ার আগেই স্লটটি ছেড়ে দেওয়া হয়েছে।" },
    unpaid: { bg: "bg-flare-soft", ring: "ring-flare/50", icon: AlertTriangle, iconClass: "text-flare-deep", title: "পেমেন্ট হয়নি", subtitle: "স্লটটি রাখা আছে, কিন্তু পেমেন্ট এখনো শেষ হয়নি।" },
    refunded: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: "টাকা ফেরত দেওয়া হয়েছে", subtitle: "এই বুকিংয়ের টাকা ফেরত দেওয়া হয়েছে, তাই টিকিটটি আর চলবে না।" },
    played: { bg: "bg-chalk", ring: "ring-line", icon: Clock, iconClass: "text-ink-3", title: "খেলা শেষ", subtitle: "টিকিটটি আসল, কিন্তু খেলার সময় পার হয়ে গেছে।" },
    invalid: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: `এটি ${site}-এর টিকিট নয়`, subtitle: `এই QR ${site} দেয়নি, অথবা এটি বদলানো হয়েছে।` },
    not_found: { bg: "bg-danger-soft", ring: "ring-danger/50", icon: XCircle, iconClass: "text-danger", title: "বুকিং পাওয়া যায়নি", subtitle: "টিকিটটি আমাদের দেওয়া, কিন্তু বুকিংটি আর নেই।" },
});

/**
 * wrongDay: admin view of a valid ticket for another day (no "Mark as used", explain why).
 * riskNote: admin view of a ticket paid with a payment SSLCommerz flagged as risky and nobody has checked yet.
 */
export default function VerifyTicket({ state, booking, canCheckIn = false, wrongDay = false, riskNote = null, siteName = "TurfZone" }) {
    const router = useRouter();
    const TONE = toneFor(siteName);
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
                        <Row label="বুকিং" value={booking.code} mono />
                        <Row label="মাঠ" value={booking.pitch} />
                        <Row label="তারিখ" value={booking.playDateLabel} note={booking.nightOf ? `${booking.nightOf}-এর রাত` : null} />
                        <Row label="সময়" value={booking.timeLabel} />
                        <Row label="খেলোয়াড়" value={booking.player} />
                        <Row label="পরিমাণ" value={taka(booking.total) + (booking.discount > 0 ? ` (${taka(booking.discount)} ছাড়)` : "")} />
                        {booking.checkedInAt && <Row label="প্রবেশ করেছেন" value={booking.checkedInLabel} />}
                    </div>

                    {riskNote && (
                        <p className="mt-5 rounded-ctl bg-flare-soft px-4 py-3 text-[13px] font-medium text-flare-deep">
                            ঢোকার আগে যাচাই করুন: SSLCommerz এই পেমেন্টকে বেশি ঝুঁকিপূর্ণ বলেছে{riskNote !== true ? ` (${riskNote})` : ""}। টিকিট ব্যবহারের আগে
                            একজন অ্যাডমিন মার্চেন্ট প্যানেলে এটি নিশ্চিত করবেন (অ্যাডমিন, পেমেন্ট, ঝুঁকিপূর্ণ)।
                        </p>
                    )}

                    {error && <p className="mt-4 rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}

                    {wrongDay && (
                        <p className="mt-5 rounded-ctl bg-flare-soft px-4 py-3 text-[13px] font-medium text-flare-deep">
                            এই টিকিট {booking.playDateLabel} তারিখের, আজকের নয়। খেলার দিনেই এটি ব্যবহৃত হিসেবে চিহ্নিত করা যাবে।
                        </p>
                    )}

                    {canCheckIn && (
                        <Button className="mt-5 w-full" variant="ink" onClick={markUsed} disabled={busy}>
                            {busy ? "চিহ্নিত হচ্ছে…" : "ব্যবহৃত হিসেবে চিহ্নিত করুন"}
                        </Button>
                    )}
                </div>
            )}

            <p className="text-center text-[12px] text-ink-4">
                {siteName} থেকে দেওয়া। প্রতিটি টিকিট আমাদের নিজস্ব সই করা, তাই এই পেজের তথ্যই প্রমাণ।
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