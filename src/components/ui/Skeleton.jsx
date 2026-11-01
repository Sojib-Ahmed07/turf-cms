// src/components/ui/Skeleton.jsx
// Grey placeholder shapes for loading.jsx screens. Server-safe (no hooks).
import { cn } from "@/lib/utils";

/** One pulsing grey shape. Size and radius come from className. */
export function Bone({ className }) {
    return <div className={cn("animate-pulse rounded-ctl bg-ink/[0.07]", className)} />;
}

/** White card outline with a soft pulse, for cards and panels. */
export function CardBone({ className, children }) {
    return <div className={cn("animate-pulse rounded-card bg-white ring-1 ring-line", className)}>{children}</div>;
}

/** Wrapper that tells screen readers the page is loading. */
export function Loading({ className, children }) {
    return (
        <div className={className} aria-busy="true" aria-live="polite">
            <span className="sr-only">লোড হচ্ছে…</span>
            {children}
        </div>
    );
}

/** n items, for repeating shapes. */
export const times = (n) => Array.from({ length: n }, (_, i) => i);