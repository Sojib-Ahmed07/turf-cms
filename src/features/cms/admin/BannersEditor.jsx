// src/features/cms/admin/BannersEditor.jsx
"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { PageHeader, Panel, Label, DragHandle } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import StatusBadge from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { CharInput, TextInput, Select } from "@/components/ui/Inputs";
import PromoBanner from "@/components/site/PromoBanner";
import { cn } from "@/lib/utils";

const PLACEMENTS = [
    { key: "top_bar", label: "Top strip", where: "Thin bar above the menu on every page", variant: null },
    { key: "home_after_hero", label: "Under the hero", where: "First thing after the big banner", variant: "ticket" },
    { key: "home_mid", label: "Mid page", where: "Between the steps and the venue section", variant: "band" },
    { key: "booking_page", label: "Booking page", where: "Above the time slots on /book", variant: "inline" },
    { key: "popup", label: "Popup", where: "Opens once per visitor after 2.5 seconds", variant: null },
];

export default function BannersEditor({ banners = {}, coupons = [] }) {
    const [placement, setPlacement] = useState("home_after_hero");
    const current = PLACEMENTS.find((p) => p.key === placement);
    const banner = banners[placement];

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Offer banners"
                description="Discount and announcement banners. Pick where a banner shows, attach a promo code, and set the dates it runs."
                actions={
                    <Button variant="ink">
                        <Plus className="h-4 w-4" />
                        New banner
                    </Button>
                }
            />

            {/* Placement tabs */}
            <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                {PLACEMENTS.map((p) => (
                    <button
                        key={p.key}
                        type="button"
                        onClick={() => setPlacement(p.key)}
                        className={cn(
                            "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold transition-colors",
                            placement === p.key ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-ink-4"
                        )}
                    >
                        {p.label}
                        <span className={cn("rounded-full px-1.5 text-[11px] tnum", placement === p.key ? "bg-white/20" : "bg-ink/5")}>{banners[p.key] ? 1 : 0}</span>
                    </button>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-7">
                    {/* Placement preview */}
                    <Panel title="How it looks" description={current.where} bodyClassName="bg-chalk/60 overflow-hidden">
                        {banner && current.variant ? (
                            <div className="pointer-events-none overflow-hidden">
                                <div style={{ zoom: 0.62 }}>
                                    <PromoBanner banner={banner} variant={current.variant} />
                                </div>
                            </div>
                        ) : banner ? (
                            <div className="rounded-ctl bg-pitch px-4 py-3 text-center text-[13px] text-white/85">
                                {banner.title} <span className="ml-2 rounded border border-dashed border-flare px-1.5 font-bold text-flare">{banner.badge ?? banner.code}</span>
                            </div>
                        ) : (
                            <p className="py-10 text-center text-[14px] text-ink-3">No banner in this spot yet.</p>
                        )}
                    </Panel>

                    {/* List */}
                    <Panel title={`Banners in "${current.label}"`} description="Only the first live banner shows. Drag to change which one." bodyClassName="p-3">
                        {banner ? (
                            <ul className="space-y-1.5">
                                {[banner, { ...banner, id: "old", title: "Eid weekend: 500 off any slot", code: "EID500" }].map((b, i) => (
                                    <li key={b.id} className={cn("flex items-center gap-3 rounded-[14px] p-2 pr-3", i === 0 ? "bg-chalk ring-2 ring-ink" : "hover:bg-chalk")}>
                                        <DragHandle />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[14px] font-semibold text-ink">{b.title}</span>
                                            <span className="mt-1 flex items-center gap-2 text-[12px] text-ink-3">
                                                <StatusBadge status={i === 0 ? "active" : "hidden"} />
                                                {b.code && <span className="font-bold tracking-wider tnum">{b.code}</span>}
                                                <span>{i === 0 ? "Until 31 Oct" : "Ended 20 Jun"}</span>
                                            </span>
                                        </span>
                                        <Button variant="ghost" size="icon" aria-label="Edit banner">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Switch size="sm" defaultChecked={i === 0} label="Show banner" />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <button type="button" className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line py-8 text-[14px] font-semibold text-ink-3 hover:text-ink">
                                <Plus className="h-4 w-4" /> Add a banner here
                            </button>
                        )}
                    </Panel>
                </div>

                {/* Editor */}
                <Panel className="xl:col-span-5" title="Edit banner">
                    <form key={placement} className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <Label>Placement</Label>
                            <Select defaultValue={placement} options={PLACEMENTS.map((p) => ({ value: p.key, label: p.label }))} />
                        </div>
                        {placement !== "top_bar" && placement !== "booking_page" && (
                            <div>
                                <Label optional>Image</Label>
                                <ImageUploader value={banner?.imageUrl ? { url: banner.imageUrl, name: "night-offer.jpg" } : null} ratio="16/7" hint="1600 × 700 px" />
                            </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                            <div>
                                <Label>Badge</Label>
                                <CharInput max={12} defaultValue={banner?.badge ?? ""} placeholder="20% off" />
                            </div>
                            <div>
                                <Label>Title</Label>
                                <CharInput max={50} defaultValue={banner?.title ?? ""} />
                            </div>
                        </div>
                        <div>
                            <Label optional>Text</Label>
                            <CharInput max={140} multiline defaultValue={banner?.body ?? ""} />
                        </div>
                        <div>
                            <Label optional>Promo code</Label>
                            <Select
                                defaultValue={banner?.code ?? ""}
                                options={[{ value: "", label: "No code" }, ...coupons.map((c) => ({ value: c.code, label: `${c.code}  (${c.type === "percent" ? `${c.value}% off` : `৳${c.value} off`})` }))]}
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label>Button text</Label>
                                <CharInput max={22} defaultValue={banner?.ctaLabel ?? ""} />
                            </div>
                            <div>
                                <Label>Button link</Label>
                                <TextInput defaultValue={banner?.ctaHref ?? ""} placeholder="/book" />
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label>Starts</Label>
                                <TextInput type="date" defaultValue="2026-10-01" />
                            </div>
                            <div>
                                <Label>Ends</Label>
                                <TextInput type="date" defaultValue="2026-10-31" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-line pt-5">
                            <Button variant="outline">Discard</Button>
                            <Button type="submit">Save banner</Button>
                        </div>
                    </form>
                </Panel>
            </div>
        </div>
    );
}
