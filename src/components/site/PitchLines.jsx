// src/components/site/PitchLines.jsx
import { cn } from "@/lib/utils";

/**
 * Chalk pitch markings drawn as a decorative layer.
 * variant="half"  -> halfway line + centre circle (hero)
 * variant="box"   -> penalty box + arc (section corners)
 */
export default function PitchLines({ variant = "half", className }) {
    if (variant === "box") {
        return (
            <svg
                viewBox="0 0 400 300"
                fill="none"
                className={cn("pointer-events-none", className)}
                aria-hidden="true"
            >
                <g stroke="currentColor" strokeWidth="2">
                    <rect x="80" y="-2" width="240" height="140" />
                    <rect x="150" y="-2" width="100" height="56" />
                    <path d="M150 138a60 60 0 0 0 100 0" />
                    <circle cx="200" cy="96" r="3" fill="currentColor" />
                </g>
            </svg>
        );
    }

    return (
        <svg
            viewBox="0 0 1200 800"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
            className={cn("pointer-events-none", className)}
            aria-hidden="true"
        >
            <g stroke="currentColor" strokeWidth="2.5">
                <line x1="760" y1="0" x2="760" y2="800" />
                <circle cx="760" cy="400" r="150" />
                <circle cx="760" cy="400" r="5" fill="currentColor" />
                <rect x="1080" y="220" width="160" height="360" />
                <rect x="1150" y="320" width="90" height="160" />
                <path d="M1080 330a90 90 0 0 0 0 140" />
            </g>
        </svg>
    );
}
