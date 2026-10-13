// src/components/site/PromoPopup.jsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { CouponCode } from "./PromoBanner";
import { canOptimize } from "@/lib/utils";

/** Shows once per visitor (placement: popup). `delayMs` before opening. */
export default function PromoPopup({ banner, delayMs = 2500 }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!banner) return;
        let seen = false;
        try {
            seen = localStorage.getItem(`promo-${banner.id}`) === "1";
        } catch { }
        if (seen) return;
        const t = setTimeout(() => setOpen(true), delayMs);
        return () => clearTimeout(t);
    }, [banner, delayMs]);

    const close = () => {
        setOpen(false);
        try {
            localStorage.setItem(`promo-${banner.id}`, "1");
        } catch { }
    };

    return (
        <AnimatePresence>
            {open && banner && (
                <motion.div
                    className="fixed inset-0 z-[60] grid place-items-end bg-ink/50 p-3 backdrop-blur-sm sm:place-items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={close}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={banner.title}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ y: 40, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-[440px] overflow-hidden rounded-frame bg-white"
                    >
                        <div className="relative h-48 bg-pitch">
                            {banner.imageUrl && (
                                <Image src={banner.imageUrl} alt="" fill sizes="440px" unoptimized={!canOptimize(banner.imageUrl)} className="object-cover opacity-70" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-pitch to-transparent" />
                            {banner.badge && (
                                <span className="absolute bottom-5 left-6 rounded-full bg-flare px-3 py-1 text-[13px] font-bold text-ink">
                                    {banner.badge}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={close}
                                aria-label="Close"
                                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink hover:bg-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6 sm:p-7">
                            <h2 className="display text-[34px] leading-[1] text-ink">{banner.title}</h2>
                            {banner.body && <p className="mt-3 text-[15px] leading-relaxed text-ink-3">{banner.body}</p>}
                            <div className="mt-6 flex flex-col gap-3">
                                {banner.code && <CouponCode code={banner.code} />}
                                {banner.ctaHref && (
                                    <Button href={banner.ctaHref} size="lg" onClick={close}>
                                        {banner.ctaLabel || "Book now"}
                                    </Button>
                                )}
                                <button type="button" onClick={close} className="py-1 text-[13px] font-medium text-ink-3 hover:text-ink">
                                    Maybe later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}