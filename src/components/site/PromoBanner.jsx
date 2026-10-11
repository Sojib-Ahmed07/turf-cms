// src/components/site/PromoBanner.jsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, Clock3, Trophy } from "lucide-react";
import Button from "@/components/ui/Button";
import PitchLines from "./PitchLines";
import { cn } from "@/lib/utils";

/**
 * One component, three looks, picked by placement:
 *   home_after_hero -> <PromoBanner variant="ticket" />
 *   home_mid        -> <PromoBanner variant="band" />
 *   booking_page    -> <PromoBanner variant="inline" />
 */
export default function PromoBanner({ banner, variant = "ticket", className }) {
    if (!banner) return null;
    if (variant === "band") return <Band banner={banner} className={className} />;
    if (variant === "inline") return <Inline banner={banner} className={className} />;
    return <TicketCard banner={banner} className={className} />;
}

/* ---------- Ticket: image stub + perforation + details ---------- */
function TicketCard({ banner, className }) {
    return (
        <section id="offers" className={cn("mx-auto max-w-6xl px-3 sm:px-6", className)}>
            <div className="relative grid overflow-hidden rounded-card bg-white ring-1 ring-line md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                {/* Stub */}
                <div className="relative min-h-[220px] overflow-hidden bg-pitch">
                    {banner.imageUrl && (
                        <Image src={banner.imageUrl} alt="" fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover opacity-60" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-pitch via-pitch/70 to-transparent" />
                    <div className="relative flex h-full flex-col justify-end p-7 sm:p-9">
                        <span className="display text-[clamp(64px,9vw,112px)] text-flare">{banner.badge}</span>
                    </div>
                </div>

                {/* Perforation */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[41.666%] hidden w-0 md:block">
                    <span className="absolute -top-3 left-0 h-6 w-6 -translate-x-1/2 rounded-full bg-chalk ring-1 ring-line" />
                    <span className="absolute -bottom-3 left-0 h-6 w-6 -translate-x-1/2 rounded-full bg-chalk ring-1 ring-line" />
                    <span className="absolute inset-y-5 left-0 border-l-2 border-dashed border-line" />
                </div>

                {/* Details */}
                <div className="flex flex-col justify-center gap-6 p-7 sm:p-10 md:pl-14">
                    <div>
                        {banner.endsAt && (
                            <p className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-flare-deep">
                                <Clock3 className="h-3.5 w-3.5" /> {banner.endsAt}
                            </p>
                        )}
                        <h2 className="display text-[clamp(28px,3.4vw,42px)] leading-[1.02] text-ink">{banner.title}</h2>
                        {banner.body && <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-3">{banner.body}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {banner.code && <CouponCode code={banner.code} />}
                        {banner.ctaHref && (
                            <Button href={banner.ctaHref} variant="ink" size="lg">
                                {banner.ctaLabel}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ---------- Band: full-width dark strip ---------- */
function Band({ banner, className }) {
    return (
        <section className={cn("px-3 sm:px-4", className)}>
            <div className="relative overflow-hidden rounded-frame bg-pitch px-6 py-12 text-white sm:px-12 sm:py-16">
                <PitchLines variant="box" className="absolute -right-10 top-0 w-[420px] text-white/10" />
                <div className="relative mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <span className="inline-flex items-center gap-2 rounded-full bg-flare px-3 py-1 text-[13px] font-bold text-ink">
                            <Trophy className="h-3.5 w-3.5" /> {banner.badge}
                        </span>
                        <h2 className="display mt-5 text-balance text-[clamp(30px,4.4vw,56px)]">{banner.title}</h2>
                        {banner.body && <p className="mt-4 text-[15px] text-white/70 sm:text-base">{banner.body}</p>}
                    </div>
                    {banner.ctaHref && (
                        <Button href={banner.ctaHref} variant="flare" size="lg">
                            {banner.ctaLabel}
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}

/* ---------- Inline: compact row above the slot board ---------- */
function Inline({ banner, className }) {
    return (
        <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card bg-flare-soft px-5 py-4 ring-1 ring-flare/40", className)}>
            <span className="display text-[28px] text-flare-deep">{banner.badge}</span>
            <p className="flex-1 text-[14px] font-medium text-ink-2">{banner.title}</p>
            {banner.code && <CouponCode code={banner.code} size="sm" />}
        </div>
    );
}

/* ---------- Coupon chip with copy ---------- */
export function CouponCode({ code, size = "md", tone = "light" }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };
    return (
        <button
            type="button"
            onClick={copy}
            className={cn(
                "group inline-flex items-center justify-between gap-3 rounded-full border-2 border-dashed font-bold tnum transition-colors",
                tone === "light"
                    ? "border-flare bg-flare-soft text-ink hover:bg-flare/25"
                    : "border-flare/70 bg-white/5 text-flare hover:bg-white/10",
                size === "sm" ? "h-9 pl-4 pr-1.5 text-[13px]" : "h-13 pl-5 pr-2 text-[15px]"
            )}
        >
            <span className="tracking-[0.12em]">{code}</span>
            <span
                className={cn(
                    "inline-flex items-center gap-1 rounded-full bg-ink font-semibold text-white",
                    size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
                )}
            >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
            </span>
        </button>
    );
}
