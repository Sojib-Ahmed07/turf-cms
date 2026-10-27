// src/features/admin/components/WalkInDialog.jsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { Label } from "@/components/admin/Kit";
import { Select, TextInput } from "@/components/ui/Inputs";
import { createWalkInBooking } from "@/features/admin/actions/bookings";
import { addDaysISO, shortDateLabel } from "@/lib/time";
import { cn, taka, time12 } from "@/lib/utils";

/** Book a slot for a player at the desk or on the phone. Uses the same live slots as /book. */
export default function WalkInDialog({ open, onClose, pitches = [], startDate, onCreated }) {
    const [pitchId, setPitchId] = useState(pitches[0]?.id ?? "");
    const [date, setDate] = useState(startDate);
    const [board, setBoard] = useState({ key: null, blocks: [] }); // last loaded slot board
    const [blockId, setBlockId] = useState(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [paid, setPaid] = useState(false);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    const dates = Array.from({ length: 14 }, (_, i) => addDaysISO(startDate, i));

    // Reload the board every time the dialog opens (a walk-in may have just taken a slot).
    const [opened, setOpened] = useState(0);
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setOpened((n) => n + 1);
    }

    const boardKey = `${pitchId}|${date}|${opened}`;
    const loading = open && Boolean(pitchId) && board.key !== boardKey;
    const blocks = board.key === boardKey ? board.blocks : [];

    useEffect(() => {
        if (!open || !pitchId) return;
        let cancelled = false;
        const key = `${pitchId}|${date}|${opened}`;
        fetch(`/api/booked-slots?pitchId=${pitchId}&date=${date}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((d) => !cancelled && setBoard({ key, blocks: d.blocks ?? [] }))
            .catch(() => !cancelled && setBoard({ key, blocks: [] }));
        return () => {
            cancelled = true;
        };
    }, [open, pitchId, date, opened]);

    function reset() {
        setBlockId(null);
        setName("");
        setPhone("");
        setPaid(false);
        setError("");
    }

    function submit() {
        setError("");
        startTransition(async () => {
            const picked = blocks.find((x) => x.id === blockId);
            const res = await createWalkInBooking({
                pitchId,
                blockId,
                date,
                startTime: picked?.start,
                customerName: name,
                customerPhone: phone,
                paidAtVenue: paid,
            });
            if (!res.ok) {
                setError(res.error);
                return;
            }
            onCreated?.(res.data.code);
            reset();
            onClose?.();
        });
    }

    const block = blocks.find((b) => b.id === blockId);

    return (
        <Dialog
            open={open}
            onClose={() => !isPending && onClose?.()}
            title="Add walk-in booking"
            description="For players booking at the desk or by phone. The booking is confirmed straight away."
            size="lg"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={isPending || !block || !name || !phone}>
                        {isPending ? "Booking…" : block ? `Book ${time12(block.start)} for ${taka(block.price)}` : "Choose a slot"}
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label>Ground</Label>
                        <Select value={pitchId} onChange={(e) => {
                            setPitchId(e.target.value);
                            setBlockId(null);
                        }} options={pitches.map((p) => ({ value: p.id, label: p.name }))} />
                    </div>
                    <div>
                        <Label>Date</Label>
                        <Select value={date} onChange={(e) => {
                            setDate(e.target.value);
                            setBlockId(null);
                        }} options={dates.map((d, i) => ({ value: d, label: i === 0 ? `Today, ${shortDateLabel(d)}` : shortDateLabel(d) }))} />
                    </div>
                </div>

                <div>
                    <Label>Time</Label>
                    {loading ? (
                        <p className="py-6 text-center text-[13px] text-ink-3">Loading slots…</p>
                    ) : blocks.length === 0 ? (
                        <p className="rounded-ctl bg-chalk px-4 py-6 text-center text-[13px] text-ink-3">No slots on this day.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {blocks.map((b) => {
                                const free = b.state === "free";
                                const selected = b.id === blockId;
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        disabled={!free}
                                        onClick={() => setBlockId(b.id)}
                                        className={cn(
                                            "rounded-[12px] px-3 py-2.5 text-left transition-colors",
                                            selected ? "bg-pitch text-white" : free ? "bg-white ring-1 ring-line hover:ring-brand" : "bg-chalk text-ink-4 line-through"
                                        )}
                                    >
                                        <span className="block text-[14px] font-bold tnum">{time12(b.start)}</span>
                                        <span className={cn("block text-[12px] tnum", selected ? "text-white/70" : "text-ink-3")}>
                                            {free ? taka(b.price) : b.state === "past" ? "Passed" : b.state === "held" ? "On hold" : "Booked"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label>Player name</Label>
                        <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Rafi Ahmed" />
                    </div>
                    <div>
                        <Label>Mobile number</Label>
                        <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01712345678" inputMode="tel" />
                    </div>
                </div>

                <label className="flex items-center justify-between gap-4 rounded-ctl bg-chalk px-4 py-3">
                    <span>
                        <span className="block text-[14px] font-semibold text-ink">Paid at the venue</span>
                        <span className="block text-[12px] text-ink-3">Turn on if the player already paid in cash or bKash at the desk.</span>
                    </span>
                    <Switch checked={paid} onChange={setPaid} label="Paid at the venue" />
                </label>

                {error && <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}
            </div>
        </Dialog>
    );
}