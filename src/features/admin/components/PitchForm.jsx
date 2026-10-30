// src/features/admin/components/PitchForm.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { Label } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import { TextInput, Select, CharInput, Segmented } from "@/components/ui/Inputs";
import { upsertPitch } from "@/features/admin/actions/pitches";
import { generateDefaultBlocks, hourOptions } from "@/features/booking/slots";
import { hhmmToMinutes } from "@/lib/time";
import { cn, time12 } from "@/lib/utils";
import { BN } from "@/i18n/format";

const SPORTS = [
    { value: "football", label: "ফুটবল" },
    { value: "cricket", label: "ক্রিকেট" },
    { value: "badminton", label: "ব্যাডমিন্টন" },
    { value: "swimming_pool", label: "সুইমিং পুল" },
];

const PRICINGS = [
    { value: "slot", label: "পুরো স্লটের দাম" },
    { value: "per_person", label: "জনপ্রতি দাম" },
];

// Quick picks under the typeable slot length. Any whole number from MIN_LEN to MAX_LEN works.
const SLOT_PRESETS = [60, 75, 90, 120];
const MIN_LEN = 15;
const MAX_LEN = 240;

/** Length of a generated block in minutes (crosses midnight safely). */
function minutesOf(b) {
    const d = hhmmToMinutes(b.endTime) - hhmmToMinutes(b.startTime);
    return d <= 0 ? d + 1440 : d;
}

/** 90 -> "১ ঘণ্টা ৩০ মিনিট", 60 -> "১ ঘণ্টা", 45 -> "৪৫ মিনিট" */
function lengthLabel(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return [h && `${BN.digits(h)} ঘণ্টা`, m && `${BN.digits(m)} মিনিট`].filter(Boolean).join(" ");
}
const HOURS = hourOptions();

export const EMPTY_PITCH = {
    id: null,
    name: "",
    description: "",
    sport: "football",
    format: "",
    size: "",
    surface: "",
    hourlyRate: "",
    pricing: "slot",
    capacity: "",
    openHour: 6,
    closeHour: 3,
    defaultSlotMinutes: 90,
    imageUrl: "",
    imagePublicId: "",
    isActive: true,
};

/**
 * Create / edit a ground (prototype: PitchesManager modal form).
 * `pitch` null = closed, EMPTY_PITCH = new, an existing pitch = edit.
 */
export default function PitchForm({ pitch, onClose }) {
    const router = useRouter();
    const [form, setForm] = useState(pitch ?? EMPTY_PITCH);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();
    const isNew = !pitch?.id;

    // Load the ground into the form whenever a different one is opened.
    const [lastPitch, setLastPitch] = useState(pitch);
    if (pitch !== lastPitch) {
        setLastPitch(pitch);
        if (pitch) {
            setForm({
                ...EMPTY_PITCH,
                ...pitch,
                hourlyRate: pitch.hourlyRate === "" ? "" : String(pitch.hourlyRate),
                capacity: pitch.capacity == null ? "" : String(pitch.capacity),
            });
            setError("");
        }
    }

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
    const perPerson = form.pricing === "per_person";

    // A swimming pool is usually sold per person: switch the pricing with the sport (the admin can change it back).
    function setSport(e) {
        const sport = e.target.value;
        setForm((f) => ({
            ...f,
            sport,
            pricing: sport === "swimming_pool" ? "per_person" : f.sport === "swimming_pool" ? "slot" : f.pricing,
            capacity: sport === "swimming_pool" && !f.capacity ? "20" : f.capacity,
        }));
    }

    const slotLen = Number(form.defaultSlotMinutes);
    const slotLenOk = String(form.defaultSlotMinutes).trim() !== "" && Number.isInteger(slotLen) && slotLen >= MIN_LEN && slotLen <= MAX_LEN;
    // What these hours + length will make (same generator the server uses)
    const preview = slotLenOk
        ? generateDefaultBlocks({ openHour: Number(form.openHour), closeHour: Number(form.closeHour), defaultSlotMinutes: slotLen, hourlyRate: 0 })
        : [];
    const fullSlots = preview.filter((b, i) => i < preview.length - 1 || minutesOf(b) === slotLen).length;
    const shortLast = preview.length && minutesOf(preview[preview.length - 1]) !== slotLen ? minutesOf(preview[preview.length - 1]) : 0;

    // Editing a ground: new hours or slot length rebuild its default slots when saved.
    const scheduleChanges =
        !isNew &&
        pitch &&
        (Number(form.openHour) !== Number(pitch.openHour) ||
            Number(form.closeHour) !== Number(pitch.closeHour) ||
            Number(form.defaultSlotMinutes) !== Number(pitch.defaultSlotMinutes));

    function submit(e) {
        e?.preventDefault();
        setError("");
        if (!slotLenOk) {
            setError(`স্লটের সময় ${BN.digits(MIN_LEN)} থেকে ${BN.digits(MAX_LEN)} মিনিটের মধ্যে একটি পূর্ণ সংখ্যা হতে হবে।`);
            return;
        }
        startTransition(async () => {
            const res = await upsertPitch({
                ...form,
                openHour: Number(form.openHour),
                closeHour: Number(form.closeHour),
                defaultSlotMinutes: Number(form.defaultSlotMinutes),
                capacity: perPerson ? form.capacity : "",
            });
            if (!res.ok) {
                setError(res.error);
                return;
            }
            onClose?.();
            if (isNew) router.push(`/admin/pitches/${res.data.pitchId}`);
            else router.refresh();
        });
    }

    return (
        <Dialog
            open={Boolean(pitch)}
            onClose={() => !isPending && onClose?.()}
            title={isNew ? "নতুন মাঠ যোগ করুন" : `${pitch?.name ?? "মাঠ"} বদলান`}
            description={
                isNew
                    ? "খোলার সময় আর স্লটের দৈর্ঘ্য দেখে প্রতিদিনের স্লট নিজে থেকেই তৈরি হবে। পরে চাইলে ঠিকঠাক করে নিতে পারবেন।"
                    : "খোলার সময় বা স্লটের দৈর্ঘ্য বদলালে প্রতিদিনের স্লটগুলো নতুন করে তৈরি হবে। প্রতিটি স্লটের দাম ঠিক করুন “স্লট বদলান” থেকে।"
            }
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        বাদ দিন
                    </Button>
                    <Button onClick={submit} disabled={isPending}>
                        {isPending ? "সেভ হচ্ছে…" : isNew ? "মাঠ যোগ করুন" : "মাঠ সেভ করুন"}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="p-name">মাঠের নাম</Label>
                        <TextInput id="p-name" value={form.name} onChange={set("name")} placeholder="পিচ সি" maxLength={40} />
                    </div>
                    <div>
                        <Label htmlFor="p-sport">খেলা</Label>
                        <Select id="p-sport" value={form.sport} onChange={setSport} options={SPORTS} />
                    </div>
                </div>

                <div className="rounded-ctl bg-chalk p-4">
                    <Label>দাম কীভাবে ধরা হবে</Label>
                    <Segmented options={PRICINGS} value={form.pricing} onChange={(v) => setForm((f) => ({ ...f, pricing: v, capacity: v === "per_person" && !f.capacity ? "20" : f.capacity }))} />
                    <p className="mt-2 text-[12px] text-ink-3">
                        {perPerson
                            ? "স্লটের দাম জনপ্রতি। খেলোয়াড় কতজন আসবেন তা সিলেক্ট করবেন, দাম হবে জনপ্রতি দাম × জন। জায়গা থাকা পর্যন্ত একই স্লট অনেকে আলাদা আলাদা বুক করতে পারবেন (যেমন সুইমিং পুল)।"
                            : "একটি বুকিংয়ে পুরো স্লট বুক হয়, যতজনই খেলুক (যেমন ফুটবল, ক্রিকেট, ব্যাডমিন্টন)।"}
                    </p>
                    {perPerson && (
                        <div className="mt-3 max-w-[220px]">
                            <Label htmlFor="p-cap">একটি স্লটে একসাথে সর্বোচ্চ কতজন</Label>
                            <div className="relative">
                                <TextInput id="p-cap" type="number" inputMode="numeric" min={1} max={500} step={1} value={form.capacity} onChange={set("capacity")} placeholder="20" className="pr-12" />
                                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-ink-3">জন</span>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <Label optional>ছোট বিবরণ</Label>
                    <CharInput max={240} multiline rows={2} value={form.description} onChange={set("description")} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                        <Label optional>কত জন করে খেলা</Label>
                        <TextInput value={form.format} onChange={set("format")} placeholder="৫ জন করে" maxLength={30} />
                    </div>
                    <div>
                        <Label optional>মাপ</Label>
                        <TextInput value={form.size} onChange={set("size")} placeholder="৪০ × ২০ মিটার" maxLength={30} />
                    </div>
                    <div>
                        <Label optional>মাঠের ধরন</Label>
                        <TextInput value={form.surface} onChange={set("surface")} placeholder="ইনডোর, ৪০ মিমি টার্ফ" maxLength={40} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="p-rate">{perPerson ? "জনপ্রতি প্রতি ঘণ্টার দাম" : "প্রতি ঘণ্টার দাম"}</Label>
                        <TextInput
                            id="p-rate"
                            type="number"
                            min={1}
                            prefix="৳"
                            value={form.hourlyRate}
                            onChange={set("hourlyRate")}
                            placeholder={perPerson ? "200" : "1600"}
                        />
                    </div>
                    <div>
                        <Label htmlFor="p-len">প্রতি স্লটের সময়</Label>
                        <div className="relative">
                            <TextInput
                                id="p-len"
                                type="number"
                                inputMode="numeric"
                                min={MIN_LEN}
                                max={MAX_LEN}
                                step={1}
                                value={form.defaultSlotMinutes}
                                onChange={set("defaultSlotMinutes")}
                                aria-invalid={!slotLenOk}
                                className={cn(
                                    "pr-14 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                    !slotLenOk && "border-danger"
                                )}
                            />
                            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-ink-3">মিনিট</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[12px] text-ink-3">তাড়াতাড়ি বেছে নিন</span>
                            {SLOT_PRESETS.map((m) => (
                                <button
                                    key={BN.digits(m)}
                                    type="button"
                                    aria-label={`${m} মিনিট`}
                                    onClick={() => setForm((f) => ({ ...f, defaultSlotMinutes: String(m) }))}
                                    className={cn(
                                        "rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors",
                                        slotLen === m ? "bg-ink text-white" : "bg-chalk text-ink-2 hover:bg-ink/10"
                                    )}
                                >
                                    {BN.digits(m)}
                                </button>
                            ))}
                        </div>
                        <p className={cn("mt-1.5 text-[12px]", slotLenOk ? "text-ink-3" : "text-danger")}>
                            {slotLenOk ? lengthLabel(slotLen) : `${BN.digits(MIN_LEN)} থেকে ${BN.digits(MAX_LEN)} মিনিট লিখুন।`}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label>খোলে</Label>
                        <Select value={form.openHour} onChange={set("openHour")} options={HOURS} />
                    </div>
                    <div>
                        <Label>বন্ধ হয়</Label>
                        <Select value={form.closeHour} onChange={set("closeHour")} options={HOURS} />
                    </div>
                </div>

                {slotLenOk && (
                    <p className="-mt-2 text-[13px] text-ink-3">
                        {preview.length === 0 ? (
                            <span className="text-danger">এই সময়ের মধ্যে {BN.digits(slotLen)} মিনিটের একটি স্লটও হয় না।</span>
                        ) : (
                            <>
                                {BN.digits(slotLen)} মিনিটের <span className="font-semibold text-ink">{BN.digits(fullSlots)}টি স্লট</span> হবে,{" "}
                                {time12(preview[0].startTime)} থেকে {time12(preview[preview.length - 1].endTime)}
                                {shortLast > 0 && `, শেষে ${BN.digits(shortLast)} মিনিটের আরও একটি স্লট`}।
                            </>
                        )}
                    </p>
                )}

                <div>
                    <Label optional>ছবি</Label>
                    <ImageUploader
                        value={form.imageUrl ? { url: form.imageUrl, publicId: form.imagePublicId || null } : null}
                        onChange={(img) => setForm((f) => ({ ...f, imageUrl: img?.url ?? "", imagePublicId: img?.publicId ?? "" }))}
                        folder="pitches"
                        ratio="16/10"
                        hint="১৬০০ × ১০০০ পিক্সেল। ছবি না দিলে মাঠের দাগের একটি নকশা দেখাবে।"
                    />
                </div>

                <label className="flex items-center justify-between gap-4 rounded-ctl bg-chalk px-4 py-3">
                    <span>
                        <span className="block text-[14px] font-semibold text-ink">বুকিং চালু</span>
                        <span className="block text-[12px] text-ink-3">বুকিং বন্ধ থাকলে মাঠটি ওয়েবসাইটে দেখাবে না।</span>
                    </span>
                    <Switch checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="বুকিং চালু" />
                </label>

                {scheduleChanges && (
                    <p className="rounded-ctl bg-flare-soft px-4 py-3 text-[13px] text-ink-2 ring-1 ring-flare/50">
                        <span className="font-semibold text-ink">সেভ করলে প্রতিদিনের স্লটগুলো নতুন করে তৈরি হবে:</span>{" "}
                        {time12(`${String(form.openHour).padStart(2, "0")}:00`)} থেকে {time12(`${String(form.closeHour).padStart(2, "0")}:00`)},{" "}
                        প্রতিটি {BN.digits(form.defaultSlotMinutes)} মিনিটের। একই সময়ের স্লটের দাম আগের মতোই থাকবে; নতুন স্লটে প্রতি ঘণ্টার দাম ধরা হবে।
                        যেসব তারিখের আলাদা স্লট বানানো আছে, আর যেসব বুকিং হয়ে গেছে, সেগুলো যেমন আছে তেমনই থাকবে।
                    </p>
                )}

                {error && <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
}