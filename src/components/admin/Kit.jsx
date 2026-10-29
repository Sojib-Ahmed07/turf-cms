// src/components/admin/Kit.jsx
// Small layout pieces shared by every admin page.
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Title row at the top of each admin page. */
export function PageHeader({ title, description, actions }) {
    return (
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
                <h1 className="display text-[clamp(30px,3.6vw,44px)] text-ink">{title}</h1>
                {description && <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </header>
    );
}

/** White card that groups related settings. */
export function Panel({ title, description, actions, className, bodyClassName, children }) {
    return (
        <section className={cn("rounded-card bg-white ring-1 ring-line", className)}>
            {(title || actions) && (
                <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                    <div>
                        {title && <h2 className="text-[16px] font-semibold text-ink wide">{title}</h2>}
                        {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{description}</p>}
                    </div>
                    {actions}
                </div>
            )}
            <div className={cn("p-6", bodyClassName)}>{children}</div>
        </section>
    );
}

/** Label on the left, control on the right (stacks on mobile). */
export function SettingRow({ label, hint, children }) {
    return (
        <div className="grid gap-3 border-b border-line py-5 first:pt-0 last:border-0 last:pb-0 md:grid-cols-[220px_1fr] md:gap-8">
            <div>
                <p className="text-[14px] font-semibold text-ink">{label}</p>
                {hint && <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{hint}</p>}
            </div>
            <div className="min-w-0">{children}</div>
        </div>
    );
}

export function Label({ children, htmlFor, optional }) {
    return (
        <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
            {children}
            {optional && <span className="font-normal text-ink-4">ঐচ্ছিক</span>}
        </label>
    );
}

/** Sticky bar shown when a form has unsaved changes. Render it only while dirty. */
export function SaveBar({ message = "পরিবর্তন এখনো সেভ হয়নি", error, children }) {
    return (
        <div className="sticky bottom-4 z-20 mt-8 flex items-center justify-between gap-4 rounded-full bg-ink py-2 pl-6 pr-2 text-white shadow-[0_20px_40px_-16px_rgb(0_0_0/0.5)]">
            <p className={cn("flex min-w-0 items-center gap-2.5 text-[14px] font-medium", error && "text-[#ffb4a8]")}>
                <span className={cn("h-2 w-2 shrink-0 rounded-full", error ? "bg-danger" : "bg-flare")} />
                <span className="truncate">{error || message}</span>
            </p>
            <div className="flex gap-2">{children}</div>
        </div>
    );
}

/** Up/down buttons for reorderable rows. onMove(-1 | 1). */
export function OrderButtons({ onMove, first, last, disabled, label = "আইটেম" }) {
    const btn = "grid h-6 w-7 place-items-center rounded-md text-ink-3 hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-30";
    return (
        <span className="flex shrink-0 flex-col" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={`${label} উপরে নিন`} disabled={disabled || first} onClick={() => onMove(-1)} className={btn}>
                <ChevronUp className="h-4 w-4" />
            </button>
            <button type="button" aria-label={`${label} নিচে নিন`} disabled={disabled || last} onClick={() => onMove(1)} className={btn}>
                <ChevronDown className="h-4 w-4" />
            </button>
        </span>
    );
}

/** Grip icon (decorative; ordering uses OrderButtons). */
export function DragHandle() {
    return (
        <span aria-hidden="true" className="grid h-8 w-6 cursor-grab place-items-center text-ink-4 hover:text-ink-2">
            <svg viewBox="0 0 10 16" className="h-4 w-2.5" fill="currentColor">
                {[2, 8, 14].map((y) => (
                    <g key={y}>
                        <circle cx="2" cy={y} r="1.4" />
                        <circle cx="8" cy={y} r="1.4" />
                    </g>
                ))}
            </svg>
        </span>
    );
}

/* ---------- Tables ---------- */
export function Table({ children, className, minWidth = 760 }) {
    return (
        <div className={cn("overflow-x-auto", className)}>
            <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth }}>{children}</table>
        </div>
    );
}

export function Th({ children, className }) {
    return <th className={cn("whitespace-nowrap border-b border-line bg-chalk/60 px-4 py-3 text-[12px] font-semibold text-ink-3 first:pl-6 last:pr-6", className)}>{children}</th>;
}

export function Td({ children, className }) {
    return <td className={cn("whitespace-nowrap border-b border-line px-4 py-3.5 text-ink-2 first:pl-6 last:pr-6", className)}>{children}</td>;
}

/** Search + filters row above a table. */
export function Toolbar({ children }) {
    return <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-6">{children}</div>;
}