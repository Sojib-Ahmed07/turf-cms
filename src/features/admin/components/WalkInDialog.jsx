// src/features/admin/components/WalkInDialog.jsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { Label } from "@/components/admin/Kit";
import { Select, TextInput } from "@/components/ui/Inputs";
import PeoplePicker from "@/components/ui/PeoplePicker";
import { createWalkInBooking } from "@/features/admin/actions/bookings";
import { addDaysISO, shortDateLabel } from "@/lib/time";
import { BOOKING_DAYS_AHEAD } from "@/features/booking/calendar";
import { cn, taka, time12 } from "@/lib/utils";
import { BN } from "@/i18n/format";
import { MAX_PEOPLE_PER_BOOKING, slotTotal } from "@/features/booking/people";

/** Book a slot for a player at the desk or on the phone. Uses the same live slots as /book. */
export default function WalkInDialog({ open, onClose, pitches = [], startDate, onCreated }) {
    const [pitchId, setPitchId] = useState(pitches[0]?.id ?? "");
    const [date, setDate] = useState(startDate);
    const [board, setBoard] = useState({ key: null, blocks: [] }); // last loaded slot board
    const [blockId, setBlockId] = useState(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [paid, setPaid] = useState(false);
    const [people, setPeople] = useState(1);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    const dates = Array.from({ length: BOOKING_DAYS_AHEAD }, (_, i) => addDaysISO(startDate, i));

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
        setPeople(1);
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
                people: perPerson ? people : undefined,
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
    // Per-person grounds (swimming pool): price x people, and only as many people as there are places left.
    const pitch = pitches.find((p) => p.id === pitchId);
    const perPerson = pitch?.pricing === "per_person";
    const maxPeople = Math.max(1, Math.min(MAX_PEOPLE_PER_BOOKING, block?.seatsLeft ?? MAX_PEOPLE_PER_BOOKING));
    const total = block ? slotTotal(block.price, perPerson ? Math.min(people, maxPeople) : null) : 0;

    return (
        <Dialog
            open={open}
            onClose={() => !isPending && onClose?.()}
            title="কাউন্টারে বুকিং যোগ করুন"
            description="যারা কাউন্টারে এসে বা ফোনে বুক করেন তাদের জন্য। বুকিং সঙ্গে সঙ্গে কনফার্ম হয়ে যাবে।"
            size="lg"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        বাদ দিন
                    </Button>
                    <Button onClick={submit} disabled={isPending || !block || !name || !phone}>
                        {isPending
                            ? "বুক হচ্ছে…"
                            : block
                                ? `${time12(block.start)} বুক করুন, ${taka(total)}${perPerson ? ` (${BN.digits(Math.min(people, maxPeople))} জন)` : ""}`
                                : "একটি স্লট সিলেক্ট করুন"}
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label>মাঠ</Label>
                        <Select value={pitchId} onChange={(e) => {
                            setPitchId(e.target.value);
                            setBlockId(null);
                        }} options={pitches.map((p) => ({ value: p.id, label: p.name }))} />
                    </div>
                    <div>
                        <Label>তারিখ</Label>
                        <Select value={date} onChange={(e) => {
                            setDate(e.target.value);
                            setBlockId(null);
                        }} options={dates.map((d, i) => ({ value: d, label: i === 0 ? `আজ, ${shortDateLabel(d)}` : shortDateLabel(d) }))} />
                    </div>
                </div>

                <div>
                    <Label>সময়</Label>
                    {loading ? (
                        <p className="py-6 text-center text-[13px] text-ink-3">স্লট লোড হচ্ছে…</p>
                    ) : blocks.length === 0 ? (
                        <p className="rounded-ctl bg-chalk px-4 py-6 text-center text-[13px] text-ink-3">এই দিনে কোনো স্লট নেই।</p>
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
                                            {free
                                                ? perPerson
                                                    ? `${taka(b.price)}/জন`
                                                    : taka(b.price)
                                                : b.state === "past"
                                                    ? "সময় শেষ"
                                                    : b.state === "held"
                                                        ? "পেমেন্ট চলছে"
                                                        : perPerson
                                                            ? "জায়গা নেই"
                                                            : "বুক হয়ে গেছে"}
                                        </span>
                                        {perPerson && free && b.seatsLeft != null && (
                                            <span className={cn("block text-[11px] tnum", selected ? "text-white/70" : "text-ink-4")}>{BN.digits(b.seatsLeft)} জনের জায়গা খালি</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {perPerson && (
                    <div>
                        <Label>কতজন</Label>
                        <PeoplePicker value={Math.min(people, maxPeople)} max={maxPeople} onChange={setPeople} />
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label>খেলোয়াড়ের নাম</Label>
                        <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="রাফি আহমেদ" />
                    </div>
                    <div>
                        <Label>মোবাইল নম্বর</Label>
                        <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01712345678" inputMode="tel" />
                    </div>
                </div>

                <label className="flex items-center justify-between gap-4 rounded-ctl bg-chalk px-4 py-3">
                    <span>
                        <span className="block text-[14px] font-semibold text-ink">মাঠে পেমেন্ট হয়ে গেছে</span>
                        <span className="block text-[12px] text-ink-3">খেলোয়াড় কাউন্টারে নগদ বা বিকাশে টাকা দিয়ে থাকলে চালু করুন।</span>
                    </span>
                    <Switch checked={paid} onChange={setPaid} label="মাঠে পেমেন্ট হয়ে গেছে" />
                </label>

                {error && <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}
            </div>
        </Dialog>
    );
}