// src/features/admin/components/PitchForm.jsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { Label } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import { TextInput, Select, CharInput } from "@/components/ui/Inputs";
import { upsertPitch } from "@/features/admin/actions/pitches";
import { hourOptions } from "@/features/booking/slots";

const SPORTS = [
    { value: "football", label: "Football" },
    { value: "cricket", label: "Cricket" },
    { value: "badminton", label: "Badminton" },
    { value: "swimming_pool", label: "Swimming pool" },
];

const SLOT_LENGTHS = [60, 75, 90, 120].map((m) => ({ value: m, label: `${m} minutes` }));
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

    useEffect(() => {
        if (pitch) {
            setForm({ ...EMPTY_PITCH, ...pitch, hourlyRate: pitch.hourlyRate === "" ? "" : String(pitch.hourlyRate) });
            setError("");
        }
    }, [pitch]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

    function submit(e) {
        e?.preventDefault();
        setError("");
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
                    : "Changing hours or slot length doesn't rebuild the schedule. Use “Rebuild from hours” in the slot editor for that."
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
                        <Label>Slot length</Label>
                        <Select value={form.defaultSlotMinutes} onChange={set("defaultSlotMinutes")} options={SLOT_LENGTHS} />
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
                        <span className="block text-[12px] text-ink-3">Closed grounds don't show on the website.</span>
                    </span>
                    <Switch checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Open for booking" />
                </label>

                {error && <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
}