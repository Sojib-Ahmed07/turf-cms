// src/components/ui/Switch.jsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Uncontrolled by default (UI phase). Pass checked/onChange to control it. */
export default function Switch({ checked, defaultChecked = false, onChange, label, size = "md" }) {
    const [inner, setInner] = useState(defaultChecked);
    const on = checked ?? inner;
    const toggle = () => {
        setInner(!on);
        onChange?.(!on);
    };
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={toggle}
            className={cn(
                "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200",
                size === "sm" ? "h-5 w-9" : "h-6 w-11",
                on ? "bg-brand" : "bg-ink/15"
            )}
        >
            <span
                className={cn(
                    "inline-block rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200",
                    size === "sm" ? "h-4 w-4" : "h-5 w-5",
                    on ? (size === "sm" ? "translate-x-[18px]" : "translate-x-[22px]") : "translate-x-0.5"
                )}
            />
        </button>
    );
}
