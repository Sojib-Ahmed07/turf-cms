// src/components/site/TopBar.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

/** Promo strip above the navbar (placement: top_bar). */
export default function TopBar({ banner }) {
    const [open, setOpen] = useState(true);
    if (!banner || !open) return null;

    return (
        <div className="relative bg-pitch text-white">
            <div className="mx-auto flex h-10 max-w-7xl items-center justify-center gap-3 px-10 text-[13px]">
                <span className="truncate text-white/85">{banner.title}</span>
                {banner.badge && (
                    <span className="hidden rounded-md border border-dashed border-flare/70 px-2 py-0.5 font-bold tracking-wide text-flare tnum sm:inline">
                        {banner.badge}
                    </span>
                )}
                {banner.ctaHref && (
                    <Link
                        href={banner.ctaHref}
                        className="shrink-0 font-semibold underline decoration-white/30 underline-offset-4 hover:decoration-white"
                    >
                        {banner.ctaLabel}
                    </Link>
                )}
            </div>
            <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Dismiss offer"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
