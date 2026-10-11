// src/components/ui/Badge.jsx
import { cn } from "@/lib/utils";

const TONES = {
    brand: "bg-brand-soft text-brand-deep",
    flare: "bg-flare-soft text-flare-deep",
    neutral: "bg-ink/5 text-ink-2",
    danger: "bg-danger-soft text-danger",
    dark: "bg-pitch text-white",
    glass: "bg-white/12 text-white ring-1 ring-inset ring-white/20 backdrop-blur",
};

export default function Badge({ tone = "neutral", dot = false, className, children }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                TONES[tone],
                className
            )}
        >
            {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            {children}
        </span>
    );
}
