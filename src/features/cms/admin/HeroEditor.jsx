// src/features/cms/admin/HeroEditor.jsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarClock, Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { PageHeader, Panel, Label, DragHandle } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import StatusBadge from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { CharInput, TextInput, Segmented } from "@/components/ui/Inputs";
import PitchLines from "@/components/site/PitchLines";
import { cn } from "@/lib/utils";

export default function HeroEditor({ slides = [] }) {
    const [selectedId, setSelectedId] = useState(slides[0]?.id);
    const [device, setDevice] = useState("desktop");
    const slide = slides.find((s) => s.id === selectedId) ?? slides[0];
    const statusOf = (i) => (i === 2 ? "scheduled" : "active");

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Hero slides"
                description="The big banner at the top of the home page. One slide shows as a fixed banner; two or more play as a slider."
                actions={
                    <Button variant="ink">
                        <Plus className="h-4 w-4" />
                        Add slide
                    </Button>
                }
            />

            {/* Preview */}
            <Panel
                title="Preview"
                description="Shows the selected slide exactly as visitors will see it."
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
                    <div
                        className="relative overflow-hidden rounded-[18px] bg-pitch"
                        style={{ aspectRatio: device === "desktop" ? "16/7" : "4/5" }}
                    >
                        {slide && <Image src={slide.imageUrl} alt="" fill sizes="900px" className="object-cover" />}
                        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgb(6_28_20/0.9)_0%,rgb(6_28_20/0.55)_45%,transparent_80%)]" />
                        <PitchLines className="absolute inset-0 h-full w-full text-white/10" />
                        <div className={cn("absolute inset-x-0 bottom-0", device === "desktop" ? "p-4 sm:p-8" : "p-5")}>
                            <span className="inline-flex rounded-full bg-flare px-2.5 py-0.5 text-[11px] font-bold text-ink">{slide?.eyebrow}</span>
                            <p className={cn("display mt-3 max-w-[16ch] text-white", device === "desktop" ? "text-[clamp(17px,3.4vw,44px)]" : "text-[26px]")}>
                                {slide?.heading}
                            </p>
                            <span className="mt-2 inline-flex rounded-full bg-brand sm:mt-4 px-4 py-2 text-[12px] font-semibold text-white">{slide?.ctaLabel}</span>
                        </div>
                    </div>
                </div>
            </Panel>

            <div className="mt-6 grid gap-6 xl:grid-cols-12">
                {/* List */}
                <div className="space-y-6 xl:col-span-5">
                    <Panel title="Slides" description="Drag to change the order." bodyClassName="p-3">
                        <ul className="space-y-1.5">
                            {slides.map((s, i) => (
                                <li key={s.id}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedId(s.id)}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-3 rounded-[14px] p-2 pr-3 transition",
                                            s.id === slide?.id ? "bg-chalk ring-2 ring-ink" : "hover:bg-chalk"
                                        )}
                                    >
                                        <DragHandle />
                                        <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-[10px] bg-pitch">
                                            <Image src={s.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[14px] font-semibold text-ink">{s.heading}</span>
                                            <span className="mt-1 block">
                                                <StatusBadge status={statusOf(i)} />
                                            </span>
                                        </span>
                                        <span onClick={(e) => e.stopPropagation()}>
                                            <Switch size="sm" defaultChecked label={`Show ${s.heading}`} />
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <button type="button" className="mt-2 flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line py-3 text-[13px] font-semibold text-ink-3 hover:border-ink-4 hover:text-ink">
                            <Plus className="h-4 w-4" />
                            Add slide
                        </button>
                    </Panel>

                    <Panel title="Slider settings">
                        <div className="space-y-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[14px] font-semibold text-ink">Time per slide</p>
                                    <p className="text-[13px] text-ink-3">How long each slide stays before the next.</p>
                                </div>
                                <Segmented options={[{ value: 4, label: "4s" }, { value: 6, label: "6s" }, { value: 8, label: "8s" }]} defaultValue={6} />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[14px] font-semibold text-ink">Pause on hover</p>
                                    <p className="text-[13px] text-ink-3">Stops the slider while the mouse is over it.</p>
                                </div>
                                <Switch defaultChecked label="Pause on hover" />
                            </div>
                        </div>
                    </Panel>
                </div>

                {/* Editor */}
                <Panel
                    className="xl:col-span-7"
                    title="Edit slide"
                    actions={
                        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger">
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </Button>
                    }
                >
                    {slide && (
                        <form key={slide.id} className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
                                <div>
                                    <Label>Desktop image</Label>
                                    <ImageUploader value={{ url: slide.imageUrl, name: "hero-night.jpg" }} ratio="16/7" hint="2400 × 1050 px or larger, JPG or WebP" />
                                </div>
                                <div>
                                    <Label optional>Mobile image</Label>
                                    <ImageUploader ratio="4/5" hint="1080 × 1350 px" />
                                </div>
                            </div>

                            <div className="grid gap-5">
                                <div>
                                    <Label>Small label</Label>
                                    <CharInput max={24} defaultValue={slide.eyebrow} placeholder="e.g. Open till 3 am" />
                                </div>
                                <div>
                                    <Label>Heading</Label>
                                    <CharInput max={60} defaultValue={slide.heading} />
                                </div>
                                <div>
                                    <Label>Text under the heading</Label>
                                    <CharInput max={160} multiline defaultValue={slide.subheading} />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label>Button text</Label>
                                        <CharInput max={20} defaultValue={slide.ctaLabel} />
                                    </div>
                                    <div>
                                        <Label>Button link</Label>
                                        <TextInput defaultValue={slide.ctaHref} placeholder="/book" />
                                    </div>
                                </div>
                                <div>
                                    <Label>Shade over the image</Label>
                                    <Segmented options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "none", label: "None" }]} defaultValue="dark" />
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
                                        <Label>Show from</Label>
                                        <TextInput type="date" />
                                    </div>
                                    <div>
                                        <Label>Hide after</Label>
                                        <TextInput type="date" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-line pt-5">
                                <Button variant="outline">Discard</Button>
                                <Button type="submit">Save slide</Button>
                            </div>
                        </form>
                    )}
                </Panel>
            </div>
        </div>
    );
}
