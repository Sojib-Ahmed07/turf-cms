// src/features/cms/admin/HeroEditor.jsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarClock, Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { PageHeader, Panel, Label, OrderButtons } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Switch from "@/components/ui/Switch";
import { CharInput, TextInput, Segmented } from "@/components/ui/Inputs";
import PitchLines from "@/components/site/PitchLines";
import { deleteHeroSlide, moveHeroSlide, saveHeroSlide, setHeroSlideActive } from "@/features/cms/actions/hero";
import { saveSliderSettings } from "@/features/cms/actions/settings";
import { canOptimize, cn } from "@/lib/utils";

const EMPTY = {
    id: null,
    image: null,
    mobileImage: null,
    alt: "",
    eyebrow: "",
    heading: "",
    subheading: "",
    ctaLabel: "Book a slot",
    ctaHref: "/book",
    overlay: "dark",
    isActive: true,
    startDate: "",
    endDate: "",
};

const FIELDS = Object.keys(EMPTY);
const toDraft = (s) => Object.fromEntries(FIELDS.map((k) => [k, s?.[k] ?? EMPTY[k]]));

// Same shades as the public HeroSlider.
const OVERLAY = {
    dark: "bg-[linear-gradient(100deg,rgb(6_28_20/0.92)_0%,rgb(6_28_20/0.65)_38%,rgb(6_28_20/0.05)_75%)]",
    light: "bg-[linear-gradient(100deg,rgb(6_28_20/0.6)_0%,rgb(6_28_20/0.3)_40%,transparent_75%)]",
    none: "",
};

/** initial: from getHeroAdmin() -> { slides, slider: { autoplayMs, pauseOnHover } } */
export default function HeroEditor({ initial }) {
    const router = useRouter();
    const slides = initial.slides;
    const [selectedId, setSelectedId] = useState(slides[0]?.id ?? "new");
    const selected = slides.find((s) => s.id === selectedId) ?? null;
    const [draft, setDraft] = useState(() => toDraft(selected));
    const [device, setDevice] = useState("desktop");
    const [error, setError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [pending, startTransition] = useTransition();
    const [busyRow, setBusyRow] = useState(null);
    const { toast, showToast } = useToast();

    const baseline = useMemo(() => toDraft(selected), [selected]);
    const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

    // After a refresh brings new server data, re-sync the form unless the admin is mid-edit.
    const [lastBaseline, setLastBaseline] = useState(baseline);
    if (baseline !== lastBaseline) {
        setLastBaseline(baseline);
        if (!dirty) setDraft(baseline);
    }

    const set = (patch) => {
        setError("");
        setDraft((d) => ({ ...d, ...patch }));
    };

    function select(id) {
        if (id === selectedId) return;
        if (dirty && !window.confirm("Discard your unsaved changes to this slide?")) return;
        const next = slides.find((s) => s.id === id) ?? null;
        setSelectedId(id);
        setDraft(toDraft(next));
        setError("");
    }

    function save() {
        startTransition(async () => {
            const res = await saveHeroSlide(draft);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setSelectedId(res.data.id);
            setDraft((d) => ({ ...d, id: res.data.id }));
            showToast(draft.id ? "Slide saved" : "Slide added");
            router.refresh();
        });
    }

    function remove() {
        startTransition(async () => {
            const res = await deleteHeroSlide(draft.id);
            setConfirmDelete(false);
            if (!res.ok) {
                showToast(res.error, "error");
                return;
            }
            const rest = slides.filter((s) => s.id !== draft.id);
            setSelectedId(rest[0]?.id ?? "new");
            setDraft(toDraft(rest[0] ?? null));
            showToast("Slide deleted");
            router.refresh();
        });
    }

    function rowAction(id, fn) {
        setBusyRow(id);
        startTransition(async () => {
            const res = await fn();
            setBusyRow(null);
            if (!res.ok) showToast(res.error, "error");
            router.refresh();
        });
    }

    const previewImage = device === "mobile" && draft.mobileImage?.url ? draft.mobileImage.url : draft.image?.url;

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Hero slides"
                description="The big banner at the top of the home page. One slide shows as a fixed banner; two or more play as a slider."
                actions={
                    <Button variant="ink" onClick={() => select("new")}>
                        <Plus className="h-4 w-4" />
                        Add slide
                    </Button>
                }
            />

            {/* Preview */}
            <Panel
                title="Preview"
                description={draft.id ? "The selected slide, with your unsaved changes." : "Your new slide, before saving."}
                actions={
                    <div className="inline-flex rounded-full bg-ink/5 p-1">
                        {[
                            ["desktop", Monitor],
                            ["mobile", Smartphone],
                        ].map(([d, Icon]) => (
                            <button
                                key={d}
                                type="button"
                                aria-label={`${d} preview`}
                                onClick={() => setDevice(d)}
                                className={cn("grid h-8 w-10 place-items-center rounded-full", device === d ? "bg-white text-ink shadow-sm" : "text-ink-3")}
                            >
                                <Icon className="h-4 w-4" />
                            </button>
                        ))}
                    </div>
                }
                bodyClassName="bg-chalk/60"
            >
                <div className={cn("mx-auto transition-[max-width] duration-500", device === "desktop" ? "max-w-full" : "max-w-[300px]")}>
                    <div className="relative overflow-hidden rounded-[18px] bg-pitch" style={{ aspectRatio: device === "desktop" ? "16/7" : "4/5" }}>
                        {previewImage && (
                            <Image src={previewImage} alt="" fill sizes="900px" unoptimized={!canOptimize(previewImage)} className="object-cover" />
                        )}
                        <div className={cn("absolute inset-0", OVERLAY[draft.overlay])} />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[rgb(6_28_20/0.7)] to-transparent" />
                        <PitchLines className="absolute inset-0 h-full w-full text-white/10" />
                        <div className={cn("absolute inset-x-0 bottom-0", device === "desktop" ? "p-4 sm:p-8" : "p-5")}>
                            {draft.eyebrow && (
                                <span className="inline-flex rounded-full bg-flare px-2.5 py-0.5 text-[11px] font-bold text-ink">{draft.eyebrow}</span>
                            )}
                            <p className={cn("display mt-3 max-w-[16ch] text-white", device === "desktop" ? "text-[clamp(17px,3.4vw,44px)]" : "text-[26px]")}>
                                {draft.heading || "Your heading"}
                            </p>
                            {draft.subheading && device === "desktop" && (
                                <p className="mt-2 hidden max-w-[46ch] text-[13px] text-white/75 sm:block">{draft.subheading}</p>
                            )}
                            {draft.ctaLabel && (
                                <span className="mt-2 inline-flex rounded-full bg-brand px-4 py-2 text-[12px] font-semibold text-brand-ink sm:mt-4">{draft.ctaLabel}</span>
                            )}
                        </div>
                    </div>
                </div>
            </Panel>

            <div className="mt-6 grid gap-6 xl:grid-cols-12">
                {/* List */}
                <div className="space-y-6 xl:col-span-5">
                    <Panel title="Slides" description="Use the arrows to change the order. Hidden and ended slides aren't shown." bodyClassName="p-3">
                        {slides.length === 0 && <p className="px-3 py-6 text-center text-[14px] text-ink-3">No slides yet. The home page shows a plain green banner.</p>}
                        <ul className="space-y-1.5">
                            {slides.map((s, i) => (
                                <li key={s.id}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => select(s.id)}
                                        onKeyDown={(e) => e.key === "Enter" && select(s.id)}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-3 rounded-[14px] p-2 pr-3 transition",
                                            s.id === selectedId ? "bg-chalk ring-2 ring-ink" : "hover:bg-chalk",
                                            busyRow === s.id && "opacity-60"
                                        )}
                                    >
                                        <OrderButtons
                                            onMove={(d) => rowAction(s.id, () => moveHeroSlide({ id: s.id, direction: d }))}
                                            first={i === 0}
                                            last={i === slides.length - 1}
                                            disabled={pending}
                                            label="slide"
                                        />
                                        <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-[10px] bg-pitch">
                                            {s.image?.url && <Image src={s.image.url} alt="" fill sizes="80px" unoptimized={!canOptimize(s.image.url)} className="object-cover" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[14px] font-semibold text-ink">{s.heading}</span>
                                            <span className="mt-1 block">
                                                <StatusBadge status={s.status} />
                                            </span>
                                        </span>
                                        <span onClick={(e) => e.stopPropagation()}>
                                            <Switch
                                                size="sm"
                                                checked={s.isActive}
                                                onChange={(v) => rowAction(s.id, () => setHeroSlideActive({ id: s.id, isActive: v }))}
                                                label={`Show ${s.heading}`}
                                            />
                                        </span>
                                    </div>
                                </li>
                            ))}
                            {selectedId === "new" && (
                                <li className="flex items-center gap-3 rounded-[14px] bg-chalk p-2 pr-3 ring-2 ring-ink">
                                    <span className="h-12 w-[108px] shrink-0 rounded-[10px] bg-pitch/80" />
                                    <span className="truncate text-[14px] font-semibold text-ink">{draft.heading || "New slide"}</span>
                                </li>
                            )}
                        </ul>
                        {selectedId !== "new" && (
                            <button
                                type="button"
                                onClick={() => select("new")}
                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line py-3 text-[13px] font-semibold text-ink-3 hover:border-ink-4 hover:text-ink"
                            >
                                <Plus className="h-4 w-4" />
                                Add slide
                            </button>
                        )}
                    </Panel>

                    <SliderSettings initial={initial.slider} onSaved={() => router.refresh()} showToast={showToast} />
                </div>

                {/* Editor */}
                <Panel
                    className="xl:col-span-7"
                    title={draft.id ? "Edit slide" : "New slide"}
                    actions={
                        draft.id && (
                            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirmDelete(true)}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </Button>
                        )
                    }
                >
                    <form
                        className="space-y-6"
                        onSubmit={(e) => {
                            e.preventDefault();
                            save();
                        }}
                    >
                        <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
                            <div>
                                <Label>Desktop image</Label>
                                <ImageUploader value={draft.image} onChange={(v) => set({ image: v })} folder="hero" ratio="16/7" hint="2400 × 1050 px or larger, JPG or WebP" />
                            </div>
                            <div>
                                <Label optional>Mobile image</Label>
                                <ImageUploader value={draft.mobileImage} onChange={(v) => set({ mobileImage: v })} folder="hero" ratio="4/5" hint="1080 × 1350 px" />
                            </div>
                        </div>

                        <div className="grid gap-5">
                            <div>
                                <Label optional>Image description</Label>
                                <CharInput max={120} value={draft.alt} onChange={(e) => set({ alt: e.target.value })} placeholder="e.g. Floodlit football turf at night" />
                            </div>
                            <div>
                                <Label optional>Small label</Label>
                                <CharInput max={24} value={draft.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} placeholder="e.g. Open till 3 am" />
                            </div>
                            <div>
                                <Label>Heading</Label>
                                <CharInput max={60} value={draft.heading} onChange={(e) => set({ heading: e.target.value })} />
                            </div>
                            <div>
                                <Label optional>Text under the heading</Label>
                                <CharInput max={160} multiline value={draft.subheading} onChange={(e) => set({ subheading: e.target.value })} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label optional>Button text</Label>
                                    <CharInput max={20} value={draft.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} />
                                </div>
                                <div>
                                    <Label optional>Button link</Label>
                                    <TextInput value={draft.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} placeholder="/book" />
                                </div>
                            </div>
                            <div>
                                <Label>Shade over the image</Label>
                                <Segmented
                                    value={draft.overlay}
                                    onChange={(v) => set({ overlay: v })}
                                    options={[
                                        { value: "dark", label: "Dark" },
                                        { value: "light", label: "Light" },
                                        { value: "none", label: "None" },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="rounded-ctl bg-chalk p-4">
                            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                                <CalendarClock className="h-4 w-4 text-ink-3" />
                                Schedule
                                <span className="font-normal text-ink-4">Optional</span>
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="h-start">Show from</Label>
                                    <TextInput id="h-start" type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                                </div>
                                <div>
                                    <Label htmlFor="h-end">Hide after</Label>
                                    <TextInput id="h-end" type="date" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                                </div>
                            </div>
                            <p className="mt-2 text-[12px] text-ink-3">Dates are Dhaka time. Leave empty to show the slide all the time.</p>
                        </div>

                        {error && <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">{error}</p>}

                        <div className="flex justify-end gap-2 border-t border-line pt-5">
                            <Button
                                variant="outline"
                                disabled={pending || !dirty}
                                onClick={() => {
                                    setDraft(baseline);
                                    setError("");
                                }}
                            >
                                Discard
                            </Button>
                            <Button type="submit" disabled={pending || (!dirty && Boolean(draft.id))}>
                                {pending ? "Saving…" : draft.id ? "Save slide" : "Add slide"}
                            </Button>
                        </div>
                    </form>
                </Panel>
            </div>

            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                size="sm"
                title="Delete this slide?"
                description="It disappears from the home page. The image stays in the media library."
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                            Keep it
                        </Button>
                        <Button variant="ink" className="bg-danger hover:bg-danger" disabled={pending} onClick={remove}>
                            Delete slide
                        </Button>
                    </>
                }
            />
            {toast}
        </div>
    );
}

function SliderSettings({ initial, onSaved, showToast }) {
    const [value, setValue] = useState(initial);
    const [pending, startTransition] = useTransition();
    const dirty = value.autoplayMs !== initial.autoplayMs || value.pauseOnHover !== initial.pauseOnHover;
    const seconds = [4000, 6000, 8000].includes(value.autoplayMs) ? value.autoplayMs : 6000;

    return (
        <Panel title="Slider settings">
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[14px] font-semibold text-ink">Time per slide</p>
                        <p className="text-[13px] text-ink-3">How long each slide stays before the next.</p>
                    </div>
                    <Segmented
                        value={seconds}
                        onChange={(v) => setValue((s) => ({ ...s, autoplayMs: v }))}
                        options={[
                            { value: 4000, label: "4s" },
                            { value: 6000, label: "6s" },
                            { value: 8000, label: "8s" },
                        ]}
                    />
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[14px] font-semibold text-ink">Pause on hover</p>
                        <p className="text-[13px] text-ink-3">Stops the slider while the mouse is over it.</p>
                    </div>
                    <Switch checked={value.pauseOnHover} onChange={(v) => setValue((s) => ({ ...s, pauseOnHover: v }))} label="Pause on hover" />
                </div>
                {dirty && (
                    <div className="flex justify-end gap-2 border-t border-line pt-4">
                        <Button variant="outline" size="sm" disabled={pending} onClick={() => setValue(initial)}>
                            Discard
                        </Button>
                        <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                                startTransition(async () => {
                                    const res = await saveSliderSettings({ autoplayMs: seconds, pauseOnHover: value.pauseOnHover });
                                    if (!res.ok) return showToast(res.error, "error");
                                    showToast("Slider settings saved");
                                    onSaved();
                                })
                            }
                        >
                            {pending ? "Saving…" : "Save settings"}
                        </Button>
                    </div>
                )}
            </div>
        </Panel>
    );
}