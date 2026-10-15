// src/features/booking/components/SlotBoard.jsx
"use client";

import { Check, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { PARTS, partOf } from "@/features/booking/parts";
import { cn, taka, time12 } from "@/lib/utils";

const ICONS = { morning: Sunrise, day: Sun, evening: Sunset, late: Moon };
const GROUPS = PARTS.map((p) => ({ ...p, icon: ICONS[p.key] }));

const minutes = (a, b) => {
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    let d = bh * 60 + bm - (ah * 60 + am);
    if (d <= 0) d += 1440;
    return d;
};

/** Time blocks grouped by part of day. state: free | booked | held | past; late = played after midnight */
export default function SlotBoard({ blocks = [], selectedId, onSelect }) {
    return (
        <div>
            <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-3">
                <Legend className="bg-white ring-1 ring-line">Free</Legend>
                <Legend className="bg-pitch">Selected</Legend>
                <Legend className="bg-flare">On hold</Legend>
                <Legend className="bg-[repeating-linear-gradient(135deg,var(--color-line)_0_3px,transparent_3px_6px)] ring-1 ring-line">Booked</Legend>
            </div>

            <div className="space-y-8">
                {GROUPS.map((g) => {
                    // grouped by when the slot starts; after-midnight slots (b.late) are always "Late night"
                    const items = blocks.filter((b) => partOf(b.start, b.late) === g.key);
                    if (!items.length) return null;
                    const free = items.filter((b) => b.state === "free").length;
                    const Icon = g.icon;
                    return (
                        <section key={g.key}>
                            <header className="mb-3 flex items-center gap-2.5">
                                <Icon className="h-4 w-4 text-ink-3" />
                                <h3 className="text-[15px] font-semibold text-ink">{g.label}</h3>
                                <span className="text-[13px] text-ink-3">
                                    {free ? `${free} free` : "Fully booked"}
                                </span>
                                <span className="ml-1 h-px flex-1 bg-line" />
                            </header>
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                                {items.map((b) => (
                                    <SlotTile key={b.id} block={b} selected={b.id === selectedId} onSelect={onSelect} />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

function SlotTile({ block, selected, onSelect }) {
    const disabled = block.state !== "free";
    const mins = minutes(block.start, block.end);

    return (
        <button
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onSelect?.(block.id)}
            className={cn(
                "group relative flex flex-col items-start rounded-[16px] p-3.5 text-left transition-[box-shadow,background-color,transform] duration-200",
                block.state === "free" && !selected && "bg-white ring-1 ring-line hover:-translate-y-0.5 hover:ring-2 hover:ring-brand",
                selected && "bg-pitch text-white shadow-[0_14px_30px_-14px_rgb(11_59_44/0.8)]",
                block.state === "booked" &&
                "cursor-not-allowed bg-[repeating-linear-gradient(135deg,rgb(15_31_25/0.04)_0_6px,transparent_6px_12px)] ring-1 ring-line",
                block.state === "held" && "cursor-not-allowed bg-flare-soft ring-1 ring-flare/50",
                block.state === "past" && "cursor-not-allowed opacity-40 ring-1 ring-line"
            )}
        >
            <span className={cn("text-[17px] font-bold tnum wide", block.state === "booked" && "text-ink-4 line-through decoration-ink-4/60")}>
                {time12(block.start)}
            </span>
            <span className={cn("text-[13px] tnum", selected ? "text-white/65" : "text-ink-3")}>
                to {time12(block.end)}, {mins} min
            </span>
            <span className="mt-3 flex w-full items-center justify-between">
                <span
                    className={cn(
                        "text-[14px] font-semibold tnum",
                        selected ? "text-white" : block.state === "free" ? "text-ink" : "text-ink-4"
                    )}
                >
                    {block.state === "booked" ? "Booked" : block.state === "held" ? "On hold" : block.state === "past" ? "Passed" : taka(block.price)}
                </span>
                {selected && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                )}
            </span>
        </button>
    );
}

function Legend({ className, children }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span className={cn("h-3.5 w-3.5 rounded-[5px]", className)} />
            {children}
        </span>
    );
}