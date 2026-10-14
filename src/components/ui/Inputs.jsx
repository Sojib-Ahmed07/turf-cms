// src/components/ui/Inputs.jsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const base =
    "w-full rounded-ctl border border-line bg-white px-3.5 text-[14px] text-ink placeholder:text-ink-4 outline-none transition-[border-color,box-shadow] focus:border-brand focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_16%,transparent)]";

/** Text input with a live character counter against `max`. */
export function CharInput({ max = 60, defaultValue = "", value: controlled, onChange, multiline = false, rows = 3, className, ...props }) {
    const [inner, setInner] = useState(defaultValue ?? "");
    const value = controlled ?? inner;
    const left = max - value.length;
    const Tag = multiline ? "textarea" : "input";
    return (
        <div className="relative">
            <Tag
                value={value}
                maxLength={max}
                rows={multiline ? rows : undefined}
                onChange={(e) => {
                    setInner(e.target.value);
                    onChange?.(e);
                }}
                className={cn(base, multiline ? "resize-none py-2.5 pb-7" : "h-11 pr-14", className)}
                {...props}
            />
            <span
                className={cn(
                    "pointer-events-none absolute right-3 text-[11px] font-semibold tnum",
                    multiline ? "bottom-2" : "top-1/2 -translate-y-1/2",
                    left <= 10 ? "text-flare-deep" : "text-ink-4"
                )}
            >
                {left}
            </span>
        </div>
    );
}

export function TextInput({ className, prefix, ...props }) {
    if (prefix) {
        return (
            <div className="flex h-11 overflow-hidden rounded-ctl border border-line bg-white focus-within:border-brand focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_16%,transparent)]">
                <span className="grid place-items-center border-r border-line bg-chalk px-3 text-[13px] font-medium text-ink-3">{prefix}</span>
                <input className={cn("min-w-0 flex-1 bg-transparent px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-4", className)} {...props} />
            </div>
        );
    }
    return <input className={cn(base, "h-11", className)} {...props} />;
}

export function Select({ options = [], className, ...props }) {
    return (
        <div className="relative">
            <select className={cn(base, "h-11 appearance-none pr-10", className)} {...props}>
                {options.map((o) => (
                    <option key={o.value ?? o} value={o.value ?? o}>
                        {o.label ?? o}
                    </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        </div>
    );
}

/** Pill-style single choice. Uncontrolled (defaultValue) or controlled (value + onChange). */
export function Segmented({ options = [], defaultValue, value: controlled, onChange, className }) {
    const [inner, setInner] = useState(defaultValue ?? options[0]?.value);
    const value = controlled ?? inner;
    return (
        <div className={cn("inline-flex rounded-full bg-ink/5 p-1", className)} role="radiogroup">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => {
                        setInner(o.value);
                        onChange?.(o.value);
                    }}
                    className={cn(
                        "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                        value === o.value ? "bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-3 hover:text-ink"
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}