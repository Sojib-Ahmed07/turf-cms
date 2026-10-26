// src/components/site/Logo.jsx
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Shows the uploaded logo when there is one, otherwise a wordmark
 * built from the site name. `tone` picks the light/dark logo.
 */
export default function Logo({ settings, tone = "dark", className, homeLabel }) {
    const src = tone === "light" ? settings?.logoDarkUrl : settings?.logoLightUrl;
    const name = settings?.siteName ?? "TurfZone";

    return (
        <Link
            href="/"
            aria-label={homeLabel ?? `${name} home`}
            className={cn("group inline-flex items-center gap-2.5", className)}
        >
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={name} className="h-9 w-auto max-w-[160px] object-contain" />
            ) : (
                <>
                    <Mark className="h-9 w-9" />
                    <span
                        className={cn(
                            "display text-[22px] leading-none",
                            tone === "light" ? "text-white" : "text-ink"
                        )}
                    >
                        {name}
                    </span>
                </>
            )}
        </Link>
    );
}

/** Brand mark: a tiny pitch seen from above. */
export function Mark({ className }) {
    return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <rect width="36" height="36" rx="10" fill="var(--brand)" />
            <g fill="none" stroke="white" strokeWidth="2">
                <rect x="7" y="7" width="22" height="22" rx="2.5" opacity="0.55" />
                <line x1="18" y1="7" x2="18" y2="29" />
                <circle cx="18" cy="18" r="4.5" />
            </g>
            <circle cx="18" cy="18" r="1.4" fill="white" />
        </svg>
    );
}