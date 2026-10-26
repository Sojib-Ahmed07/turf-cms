// src/features/booking/components/BookingSummary.jsx
"use client";

import { useState } from "react";
import { CalendarDays, Clock3, Hourglass, Lock, MapPin, Tag, X } from "lucide-react";
import Button from "@/components/ui/Button";
import PayMethodPicker from "@/features/payment/components/PayMethodPicker";
import { cn, taka, time12 } from "@/lib/utils";

/**
 * Right-hand checkout card. State lives in BookingClient:
 *   onPay / busy / error           pay button
 *   coupon                         applied code { code, discount, total } or null
 *   onApplyCoupon(code)            async, returns { ok, error }
 *   onRemoveCoupon()               clear the code
 *   showCoupon                     show the promo code box (default on)
 *   methods / method / onMethodChange  payment methods [{ id, label, hint }] and the chosen one
 */
export default function BookingSummary({
    pitch,
    dateLabel,
    block,
    onPay,
    busy = false,
    error = "",
    isSignedIn = true,
    showCoupon = true,
    venue = "",
    coupon = null,
    onApplyCoupon,
    onRemoveCoupon,
    methods = [],
    method = "",
    onMethodChange,
}) {
    const [code, setCode] = useState("");
    const [checking, setChecking] = useState(false);
    const [codeError, setCodeError] = useState("");

    const subtotal = Number(block?.price ?? 0);
    const discount = coupon ? coupon.discount : 0;
    const total = Math.max(0, subtotal - discount);

    async function apply(e) {
        e.preventDefault();
        if (!code.trim() || !onApplyCoupon) return;
        if (!block) {
            setCodeError("Pick a time slot first, then apply the code.");
            return;
        }
        setChecking(true);
        setCodeError("");
        const res = await onApplyCoupon(code);
        setChecking(false);
        if (!res.ok) setCodeError(res.error);
        else setCode("");
    }

    return (
        <aside className="overflow-hidden rounded-card bg-white ring-1 ring-line">
            <div className="bg-pitch px-6 pb-6 pt-5 text-white">
                <p className="text-[13px] font-medium text-white/60">Your booking</p>
                <p className="display mt-1 text-[30px]">{pitch?.name ?? "Pick a ground"}</p>
                <p className="mt-0.5 text-[14px] text-white/60">{pitch?.format}</p>
            </div>

            {/* perforation */}
            <div aria-hidden="true" className="relative h-0">
                <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
                <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
            </div>

            <div className="space-y-6 p-6">
                <dl className="space-y-3 text-[14px]">
                    <Line icon={CalendarDays} label="Date" value={dateLabel} />
                    <Line
                        icon={Clock3}
                        label="Time"
                        value={block ? `${time12(block.start)} to ${time12(block.end)}` : "Choose a slot"}
                        muted={!block}
                    />
                    {venue && <Line icon={MapPin} label="Venue" value={venue} />}
                </dl>

                {/* Coupon */}
                {!showCoupon ? null : coupon ? (
                    <div className="flex items-center justify-between rounded-ctl bg-brand-soft px-4 py-3">
                        <span className="flex items-center gap-2 text-[14px] font-semibold text-brand-deep">
                            <Tag className="h-4 w-4" />
                            {coupon.code} applied, {taka(coupon.discount)} off
                        </span>
                        <button type="button" aria-label="Remove code" onClick={onRemoveCoupon} className="grid h-7 w-7 place-items-center rounded-full text-brand-deep hover:bg-white/60">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ) : (
                    <div>
                        <form onSubmit={apply} className="flex rounded-ctl ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
                            <input
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value);
                                    setCodeError("");
                                }}
                                placeholder="Promo code"
                                aria-label="Promo code"
                                maxLength={30}
                                className="h-11 min-w-0 flex-1 bg-transparent px-4 text-[14px] font-semibold uppercase tracking-wider outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-4"
                            />
                            <button
                                type="submit"
                                disabled={checking || !code.trim()}
                                className="m-1 rounded-[10px] bg-chalk px-4 text-[13px] font-semibold text-ink hover:bg-grass disabled:opacity-50"
                            >
                                {checking ? "Checking…" : "Apply"}
                            </button>
                        </form>
                        {codeError && <p className="mt-2 text-[13px] font-medium text-danger">{codeError}</p>}
                    </div>
                )}

                {/* Totals */}
                <div className="space-y-2 border-t border-dashed border-line pt-5 text-[14px]">
                    <Row label="Slot price" value={taka(subtotal)} />
                    {discount > 0 && <Row label="Discount" value={`−${taka(discount)}`} accent />}
                    <div className="flex items-end justify-between pt-2">
                        <span className="font-semibold text-ink">Total</span>
                        <span className="display text-[34px] text-ink tnum">{taka(total)}</span>
                    </div>
                </div>

                {block && total > 0 && onMethodChange && (
                    <PayMethodPicker methods={methods} value={method} onChange={onMethodChange} />
                )}

                {error && <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}

                <Button size="lg" className="h-14 w-full text-base" disabled={!block || busy} onClick={onPay}>
                    <Lock className="h-4 w-4" />
                    {!block
                        ? "Choose a slot to continue"
                        : busy
                            ? "Reserving your slot…"
                            : isSignedIn
                                ? total === 0
                                    ? "Book for free"
                                    : `Pay ${taka(total)}`
                                : "Sign in to book"}
                </Button>

                <div className="space-y-3">
                    <p className="flex items-start gap-2 text-[13px] leading-snug text-ink-3">
                        <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        We hold the slot for 15 minutes while you pay.
                    </p>
                    {acceptedBadges(methods).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {acceptedBadges(methods).map((m) => (
                                <span key={m} className="rounded-md bg-chalk px-2 py-1 text-[11px] font-semibold text-ink-2 ring-1 ring-inset ring-line">
                                    {m}
                                </span>
                            ))}
                            <span className="ml-1 text-[11px] text-ink-3">Secure checkout</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

/** Small "we accept" badges for the methods that are switched on. */
function acceptedBadges(methods) {
    const ids = methods.filter((m) => m.enabled !== false).map((m) => m.id);
    const list = [];
    if (ids.includes("bkash") || ids.includes("sslcommerz")) list.push("bKash");
    if (ids.includes("sslcommerz")) list.push("Nagad", "Rocket", "Visa", "Mastercard");
    return list;
}

function Line({ icon: Icon, label, value, muted }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 shrink-0 text-ink-4" />
            <dt className="w-14 shrink-0 text-ink-3">{label}</dt>
            <dd className={cn("ml-auto text-right font-semibold tnum", muted ? "text-ink-4" : "text-ink")}>{value}</dd>
        </div>
    );
}

function Row({ label, value, accent }) {
    return (
        <div className="flex justify-between">
            <span className="text-ink-3">{label}</span>
            <span className={cn("font-semibold tnum", accent ? "text-brand-deep" : "text-ink")}>{value}</span>
        </div>
    );
}