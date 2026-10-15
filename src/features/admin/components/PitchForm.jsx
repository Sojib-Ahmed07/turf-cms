// src/features/admin/components/PitchForm.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { Label } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import { TextInput, Select, CharInput } from "@/components/ui/Inputs";
import { upsertPitch } from "@/features/admin/actions/pitches";
import { generateDefaultBlocks, hourOptions } from "@/features/booking/slots";
import { hhmmToMinutes } from "@/lib/time";
import { cn, time12 } from "@/lib/utils";

const SPORTS = [
    { value: "football", label: "Football" },
    { value: "cricket", label: "Cricket" },
    { value: "badminton", label: "Badminton" },
    { value: "swimming_pool", label: "Swimming pool" },
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

/** 90 -> "1 h 30 min", 60 -> "1 h", 45 -> "45 min" */
function lengthLabel(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return [h && `${h} h`, m && `${m} min`].filter(Boolean).join(" ");
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
            setForm({ ...EMPTY_PITCH, ...pitch, hourlyRate: pitch.hourlyRate === "" ? "" : String(pitch.hourlyRate) });
            setError("");
        }
    }

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

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
            setError(`Slot length must be a whole number of minutes from ${MIN_LEN} to ${MAX_LEN}.`);
            return;
        }
        startTransition(async () => {
            const res = await upsertPitch({
                ...form,
                openHour: Number(form.openHour),
                closeHour: Number(form.closeHour),
                defaultSlotMinutes: Number(form.defaultSlotMinutes),
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
            title={isNew ? "Add a ground" : `Edit ${pitch?.name ?? "ground"}`}
            description={
                isNew
                    ? "We'll build a default schedule from the hours and slot length. You can fine-tune it next."
                    : "Change the hours or slot length and the default slots are rebuilt to match. Prices per slot are set in Edit slots."
            }
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={isPending}>
                        {isPending ? "Saving…" : isNew ? "Add ground" : "Save ground"}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="p-name">Name</Label>
                        <TextInput id="p-name" value={form.name} onChange={set("name")} placeholder="Pitch C" maxLength={40} />
                    </div>
                    <div>
                        <Label htmlFor="p-sport">Sport</Label>
                        <Select id="p-sport" value={form.sport} onChange={set("sport")} options={SPORTS} />
                    </div>
                </div>

                <div>
                    <Label optional>Short description</Label>
                    <CharInput max={240} multiline rows={2} value={form.description} onChange={set("description")} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                        <Label optional>Format</Label>
                        <TextInput value={form.format} onChange={set("format")} placeholder="5-a-side" maxLength={30} />
                    </div>
                    <div>
                        <Label optional>Size</Label>
                        <TextInput value={form.size} onChange={set("size")} placeholder="40 × 20 m" maxLength={30} />
                    </div>
                    <div>
                        <Label optional>Surface</Label>
                        <TextInput value={form.surface} onChange={set("surface")} placeholder="Indoor, 40 mm turf" maxLength={40} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="p-rate">Price per hour</Label>
                        <TextInput
                            id="p-rate"
                            type="number"
                            min={1}
                            prefix="৳"
                            value={form.hourlyRate}
                            onChange={set("hourlyRate")}
                            placeholder="1600"
                        />
                    </div>
                    <div>
                        <Label htmlFor="p-len">Slot length</Label>
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
                            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-ink-3">min</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[12px] text-ink-3">Quick pick</span>
                            {SLOT_PRESETS.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    aria-label={`${m} minutes`}
                                    onClick={() => setForm((f) => ({ ...f, defaultSlotMinutes: String(m) }))}
                                    className={cn(
                                        "rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors",
                                        slotLen === m ? "bg-ink text-white" : "bg-chalk text-ink-2 hover:bg-ink/10"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        <p className={cn("mt-1.5 text-[12px]", slotLenOk ? "text-ink-3" : "text-danger")}>
                            {slotLenOk ? lengthLabel(slotLen) : `Type ${MIN_LEN} to ${MAX_LEN} minutes.`}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label>Opens at</Label>
                        <Select value={form.openHour} onChange={set("openHour")} options={HOURS} />
                    </div>
                    <div>
                        <Label>Closes at</Label>
                        <Select value={form.closeHour} onChange={set("closeHour")} options={HOURS} />
                    </div>
                </div>

                {slotLenOk && (
                    <p className="-mt-2 text-[13px] text-ink-3">
                        {preview.length === 0 ? (
                            <span className="text-danger">These hours are shorter than one {slotLen}-minute slot.</span>
                        ) : (
                            <>
                                Makes <span className="font-semibold text-ink">{fullSlots} slot{fullSlots === 1 ? "" : "s"}</span> of {slotLen} min,{" "}
                                {time12(preview[0].startTime)} to {time12(preview[preview.length - 1].endTime)}
                                {shortLast > 0 && `, plus a ${shortLast}-min slot at the end`}.
                            </>
                        )}
                    </p>
                )}

                <div>
                    <Label optional>Photo</Label>
                    <ImageUploader
                        value={form.imageUrl ? { url: form.imageUrl, publicId: form.imagePublicId || null } : null}
                        onChange={(img) => setForm((f) => ({ ...f, imageUrl: img?.url ?? "", imagePublicId: img?.publicId ?? "" }))}
                        folder="pitches"
                        ratio="16/10"
                        hint="1600 × 1000 px. Without a photo, the ground shows chalk pitch lines."
                    />
                </div>

                <label className="flex items-center justify-between gap-4 rounded-ctl bg-chalk px-4 py-3">
                    <span>
                        <span className="block text-[14px] font-semibold text-ink">Open for booking</span>
                        <span className="block text-[12px] text-ink-3">Closed grounds don&apos;t show on the website.</span>
                    </span>
                    <Switch checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Open for booking" />
                </label>

                {scheduleChanges && (
                    <p className="rounded-ctl bg-flare-soft px-4 py-3 text-[13px] text-ink-2 ring-1 ring-flare/50">
                        <span className="font-semibold text-ink">Saving rebuilds the default slots</span> for{" "}
                        {time12(`${String(form.openHour).padStart(2, "0")}:00`)} to {time12(`${String(form.closeHour).padStart(2, "0")}:00`)},{" "}
                        {form.defaultSlotMinutes} min each. Slots with the same times keep their price; new ones use the base price.
                        Dates with a custom schedule and existing bookings stay as they are.
                    </p>
                )}

                {error && <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
}