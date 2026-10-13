// src/features/admin/components/SlotEditor.jsx
"use client";

// Slot editor for one ground. Logic ported from the prototype's
// src/app/admin/_components/SlotEditor.jsx (default schedule + 30 days of
// per-date custom schedules, resize by ±15/30 min, delete, price per block),
// shown as a full page in the new admin design.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Clock3, Copy, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/Kit";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import {
    applyResize,
    deleteBlock,
    deriveHours,
    minutesBetween,
    minutesToHHMM,
    hhmmToMinutes,
    MAX_SLOT_MINUTES,
} from "@/features/booking/slots";
import {
    regenerateDefaultBlocks,
    replaceDateBlocks,
    replaceDefaultBlocks,
    resetDateToDefault,
    seedDateFromDefault,
} from "@/features/admin/actions/pitches";
import { cn, taka, time12 } from "@/lib/utils";

/**
 * props (from getPitchEditorData):
 *   pitch          { id, name, defaultSlotMinutes, hourlyRate, ... }
 *   defaultBlocks  [{ startTime, endTime, price, sortOrder }]
 *   days           [{ date, label, isOverride, bookedCount, blocks }]
 */
export default function SlotEditor({ pitch, defaultBlocks: initialDefault, days: initialDays }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [tab, setTab] = useState("default"); // "default" or a date
    const [defaultBlocks, setDefaultBlocks] = useState(initialDefault);
    const [days, setDays] = useState(initialDays);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState("");
    const [note, setNote] = useState("");
    const [confirm, setConfirm] = useState(null); // { title, body, action, label }
    const dirtyRef = useRef(false);
    dirtyRef.current = dirty;

    // After a save/refresh the server sends fresh props: adopt them unless the admin is mid-edit.
    useEffect(() => {
        if (dirtyRef.current) return;
        setDefaultBlocks(initialDefault);
        setDays(initialDays);
    }, [initialDefault, initialDays]);

    const isDefault = tab === "default";
    const activeDay = isDefault ? null : days.find((d) => d.date === tab);
    const blocks = isDefault ? defaultBlocks : activeDay?.blocks ?? [];
    const derived = blocks.length ? deriveHours(blocks) : null;
    const totalMinutes = useMemo(() => blocks.reduce((s, b) => s + minutesBetween(b.startTime, b.endTime), 0), [blocks]);

    // Days that use the default schedule show default blocks; keep them in sync while editing the default.
    function setBlocks(updater) {
        setDirty(true);
        if (isDefault) {
            setDefaultBlocks((prev) => {
                const next = typeof updater === "function" ? updater(prev) : updater;
                setDays((ds) => ds.map((d) => (d.isOverride ? d : { ...d, blocks: next })));
                return next;
            });
        } else {
            setDays((prev) =>
                prev.map((d) => (d.date === tab ? { ...d, blocks: typeof updater === "function" ? updater(d.blocks) : updater } : d))
            );
        }
    }

    function switchTab(next) {
        if (next === tab) return;
        if (dirty) {
            setConfirm({
                title: "Discard unsaved changes?",
                body: "You changed this schedule but didn't save it.",
                label: "Discard changes",
                danger: true,
                action: () => {
                    // reload from server state
                    setDefaultBlocks(initialDefault);
                    setDays(initialDays);
                    setDirty(false);
                    setTab(next);
                    setError("");
                    setNote("");
                },
            });
            return;
        }
        setTab(next);
        setError("");
        setNote("");
    }

    function resize(i, delta) {
        setError("");
        const res = applyResize(blocks, i, delta);
        setBlocks(res.blocks);
        setNote(res.note ?? "");
    }

    function remove(i) {
        setError("");
        setNote("");
        setBlocks((prev) => deleteBlock(prev, i));
    }

    function updatePrice(i, value) {
        setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, price: value } : b)));
    }

    /** Add a block after the last one, using the ground's slot length and hourly rate. */
    function addBlock() {
        setError("");
        const len = pitch.defaultSlotMinutes || 90;
        const last = blocks[blocks.length - 1];
        const startMin = last ? hhmmToMinutes(last.endTime) : (pitch.openHour ?? 6) * 60;
        const price = Math.round((Number(pitch.hourlyRate) * len) / 60);
        setBlocks((prev) => [
            ...prev,
            { startTime: minutesToHHMM(startMin), endTime: minutesToHHMM(startMin + len), price: String(price), sortOrder: prev.length },
        ]);
        setNote("Added a block after the last one. Check that it doesn't run past closing time.");
    }

    function run(fn, after) {
        setError("");
        setNote("");
        startTransition(async () => {
            const res = await fn();
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setDirty(false);
            after?.();
            router.refresh();
        });
    }

    function save() {
        if (isDefault) {
            run(() => replaceDefaultBlocks(pitch.id, defaultBlocks), () => setNote("Default schedule saved. Days without a custom schedule use it now."));
        } else if (activeDay) {
            const go = () =>
                run(
                    () => replaceDateBlocks(pitch.id, activeDay.date, activeDay.blocks),
                    () => {
                        setDays((ds) => ds.map((d) => (d.date === activeDay.date ? { ...d, isOverride: true } : d)));
                        setNote(`Custom schedule saved for ${activeDay.label}.`);
                    }
                );
            if (activeDay.bookedCount > 0) {
                setConfirm({
                    title: "This day already has bookings",
                    body: `${activeDay.bookedCount} booking${activeDay.bookedCount === 1 ? "" : "s"} exist for ${activeDay.label}. Existing bookings keep their time and price, but if you remove or move their slot, players may turn up for a slot that's no longer on the schedule.`,
                    label: "Save anyway",
                    action: go,
                });
                return;
            }
            go();
        }
    }

    const tabs = [{ key: "default", label: "Default schedule" }, ...days.map((d) => ({ key: d.date, label: d.label, custom: d.isOverride, booked: d.bookedCount }))];

    return (
        <div className="mx-auto max-w-[1080px] pb-28">
            <Link href="/admin/pitches" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 hover:text-ink">
                <ArrowLeft className="h-3.5 w-3.5" />
                All grounds
            </Link>
            <PageHeader
                title={`${pitch.name} slots`}
                description="The default schedule is used every day. Give a date its own schedule for holidays, tournaments or maintenance."
            />

            {/* Tabs */}
            <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {tabs.map((t) => {
                    const active = t.key === tab;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => switchTab(t.key)}
                            className={cn(
                                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-colors",
                                active ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-ink-4",
                                t.key === "default" && !active && "ring-2 ring-ink/20"
                            )}
                        >
                            {t.label}
                            {t.custom && (
                                <span className={cn("rounded-full px-1.5 text-[10px] font-bold", active ? "bg-flare text-ink" : "bg-flare-soft text-flare-deep")}>
                                    Custom
                                </span>
                            )}
                            {t.booked > 0 && (
                                <span className={cn("rounded-full px-1.5 text-[10px] font-bold tnum", active ? "bg-white/20" : "bg-brand-soft text-brand-deep")}>
                                    {t.booked}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <Panel
                title={isDefault ? "Default schedule" : `${activeDay?.label} ${activeDay?.isOverride ? "(custom schedule)" : "(uses the default)"}`}
                description={
                    derived
                        ? `${blocks.length} slot${blocks.length === 1 ? "" : "s"}, ${time12(blocks[0].startTime)} to ${time12(blocks[blocks.length - 1].endTime)}, ${Math.round(totalMinutes / 6) / 10} hours bookable`
                        : "No slots on this schedule."
                }
                actions={
                    isDefault ? (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                                setConfirm({
                                    title: "Rebuild from the ground's hours?",
                                    body: `This replaces the default schedule with ${pitch.defaultSlotMinutes}-minute slots from the ground's opening to closing hour, priced from ${taka(pitch.hourlyRate)}/hr. Your manual edits to the default will be lost.`,
                                    label: "Rebuild schedule",
                                    danger: true,
                                    action: () => run(() => regenerateDefaultBlocks(pitch.id), () => setNote("Default schedule rebuilt.")),
                                })
                            }
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Rebuild from hours
                        </Button>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {!activeDay?.isOverride ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() =>
                                        run(
                                            () => seedDateFromDefault(pitch.id, activeDay.date),
                                            () => {
                                                setDays((ds) => ds.map((d) => (d.date === activeDay.date ? { ...d, isOverride: true } : d)));
                                                setNote(`${activeDay.label} now has its own schedule. Edit it and save.`);
                                            }
                                        )
                                    }
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                    Make custom for this day
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() =>
                                        setConfirm({
                                            title: `Use the default schedule on ${activeDay.label}?`,
                                            body: "The custom schedule for this day will be deleted.",
                                            label: "Reset to default",
                                            danger: true,
                                            action: () =>
                                                run(
                                                    () => resetDateToDefault(pitch.id, activeDay.date),
                                                    () => {
                                                        setDays((ds) =>
                                                            ds.map((d) => (d.date === activeDay.date ? { ...d, isOverride: false, blocks: defaultBlocks } : d))
                                                        );
                                                        setNote(`${activeDay.label} uses the default schedule again.`);
                                                    }
                                                ),
                                        })
                                    }
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Reset to default
                                </Button>
                            )}
                        </div>
                    )
                }
                bodyClassName="p-3 sm:p-4"
            >
                {!isDefault && !activeDay?.isOverride && (
                    <p className="mb-3 rounded-ctl bg-chalk px-4 py-3 text-[13px] text-ink-2">
                        This day follows the default schedule. To change only this day, choose “Make custom for this day”. To change every day, edit the
                        default schedule.
                    </p>
                )}

                {blocks.length === 0 ? (
                    <div className="rounded-ctl border-2 border-dashed border-line px-6 py-12 text-center text-[14px] text-ink-3">
                        {isDefault ? "No slots yet. Use “Rebuild from hours” or add a slot." : "No slots on this day: the ground is closed for booking."}
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {blocks.map((b, i) => {
                            const dur = minutesBetween(b.startTime, b.endTime);
                            const locked = !isDefault && !activeDay?.isOverride;
                            return (
                                <li
                                    key={`${b.startTime}-${i}`}
                                    className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[16px] bg-white p-3 ring-1 ring-line sm:flex-nowrap"
                                >
                                    <div className="flex min-w-[210px] items-center gap-3">
                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-grass text-pitch">
                                            <Clock3 className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <p className="text-[15px] font-bold text-ink tnum wide">
                                                {time12(b.startTime)} to {time12(b.endTime)}
                                            </p>
                                            <p className="text-[12px] text-ink-3 tnum">{dur} min</p>
                                        </div>
                                    </div>

                                    <label className="flex h-10 items-center overflow-hidden rounded-ctl border border-line bg-white focus-within:border-brand">
                                        <span className="grid h-full place-items-center border-r border-line bg-chalk px-3 text-[13px] text-ink-3">৳</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={b.price}
                                            disabled={locked}
                                            onChange={(e) => updatePrice(i, e.target.value)}
                                            aria-label={`Price for ${time12(b.startTime)}`}
                                            className="h-full w-24 bg-transparent px-3 text-[14px] font-semibold text-ink outline-none tnum disabled:text-ink-4"
                                        />
                                    </label>

                                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                                        <SmallBtn disabled={locked || dur <= 30} onClick={() => resize(i, -30)}>−30m</SmallBtn>
                                        <SmallBtn disabled={locked || dur <= 15} onClick={() => resize(i, -15)}>−15m</SmallBtn>
                                        <SmallBtn disabled={locked || dur + 15 > MAX_SLOT_MINUTES} onClick={() => resize(i, 15)}>+15m</SmallBtn>
                                        <SmallBtn disabled={locked || dur + 30 > MAX_SLOT_MINUTES} onClick={() => resize(i, 30)} accent>
                                            +30m
                                        </SmallBtn>
                                        <button
                                            type="button"
                                            disabled={locked}
                                            onClick={() => remove(i)}
                                            aria-label={`Delete ${time12(b.startTime)} slot`}
                                            className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {(isDefault || activeDay?.isOverride) && (
                    <button
                        type="button"
                        onClick={addBlock}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-line py-3 text-[13px] font-semibold text-ink-3 hover:border-ink-4 hover:text-ink"
                    >
                        <Plus className="h-4 w-4" />
                        Add a slot after the last one
                    </button>
                )}

                <p className="mt-4 px-1 text-[12px] leading-relaxed text-ink-3">
                    Making a slot longer pushes every later slot back; making it shorter pulls them earlier. Deleting a slot leaves a gap. Existing bookings keep
                    their own time and price.
                </p>
            </Panel>

            {(note || error) && (
                <div
                    className={cn(
                        "mt-4 flex items-start gap-2 rounded-ctl px-4 py-3 text-[14px] font-medium",
                        error ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-deep"
                    )}
                >
                    {error && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                    {error || note}
                </div>
            )}

            {/* Sticky save bar */}
            {dirty && (
                <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-[1000px] items-center justify-between gap-4 rounded-full bg-ink py-2 pl-6 pr-2 text-white shadow-[0_20px_40px_-16px_rgb(0_0_0/0.5)] lg:left-[296px]">
                    <p className="flex items-center gap-2.5 text-[14px] font-medium">
                        <span className="h-2 w-2 rounded-full bg-flare" />
                        Unsaved changes to {isDefault ? "the default schedule" : activeDay?.label}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline-light"
                            size="sm"
                            disabled={isPending}
                            onClick={() => {
                                setDefaultBlocks(initialDefault);
                                setDays(initialDays);
                                setDirty(false);
                                setNote("");
                                setError("");
                            }}
                        >
                            Discard
                        </Button>
                        <Button size="sm" onClick={save} disabled={isPending}>
                            {isPending ? "Saving…" : isDefault ? "Save default" : "Save this day"}
                        </Button>
                    </div>
                </div>
            )}

            <Dialog
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                title={confirm?.title}
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setConfirm(null)}>
                            Keep editing
                        </Button>
                        <Button
                            variant={confirm?.danger ? "ink" : "brand"}
                            onClick={() => {
                                const a = confirm?.action;
                                setConfirm(null);
                                a?.();
                            }}
                        >
                            {confirm?.label}
                        </Button>
                    </>
                }
            >
                <p className="text-[14px] leading-relaxed text-ink-2">{confirm?.body}</p>
            </Dialog>
        </div>
    );
}

function SmallBtn({ children, accent, ...props }) {
    return (
        <button
            type="button"
            className={cn(
                "h-8 rounded-full px-2.5 text-[12px] font-bold tnum transition-colors disabled:opacity-30",
                accent ? "bg-brand-soft text-brand-deep hover:bg-brand hover:text-brand-ink" : "bg-chalk text-ink-2 hover:bg-grass"
            )}
            {...props}
        >
            {children}
        </button>
    );
}