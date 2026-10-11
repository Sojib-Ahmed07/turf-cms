// src/features/cms/admin/BrandingForm.jsx
"use client";

import { useState } from "react";
import { Check, Ticket } from "lucide-react";
import { PageHeader, Panel, SettingRow, SaveBar } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import Button from "@/components/ui/Button";
import { CharInput } from "@/components/ui/Inputs";
import { Mark } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

const PRESETS = ["#18a058", "#0e7c66", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0f172a"];

export default function BrandingForm({ settings }) {
    const [color, setColor] = useState("#18a058");
    const [name, setName] = useState(settings.siteName);

    return (
        <div className="mx-auto max-w-[1080px]" style={{ "--brand": color }}>
            <PageHeader title="Branding" description="Your logo, name and brand colour. Changes show on every page of the website." />

            {/* Live preview */}
            <div className="mb-6 overflow-hidden rounded-card bg-chalk ring-1 ring-line">
                <p className="border-b border-line bg-white px-5 py-2.5 text-[12px] font-medium text-ink-3">Live preview</p>
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className="flex items-center gap-2.5">
                        <Mark className="h-9 w-9" />
                        <span className="display text-[20px] text-ink">{name || "Site name"}</span>
                    </span>
                    <span className="ml-auto hidden items-center gap-5 text-[14px] text-ink-3 md:flex">
                        <span className="relative font-medium text-ink">
                            Home
                            <span className="absolute inset-x-0 -bottom-[17px] h-[3px] rounded-t-full bg-brand" />
                        </span>
                        <span>Book a slot</span>
                        <span>Grounds</span>
                    </span>
                    <span className="hidden items-center gap-1.5 text-[14px] text-ink-2 sm:flex">
                        <Ticket className="h-4 w-4" /> My bookings
                    </span>
                    <Button size="sm">Book a slot</Button>
                </div>
            </div>

            <div className="space-y-6">
                <Panel title="Logo" description="PNG or SVG with a transparent background works best.">
                    <SettingRow label="For light backgrounds" hint="Used in the menu bar.">
                        <ImageUploader ratio="3/1" hint="At least 480 × 160 px" className="max-w-sm" />
                    </SettingRow>
                    <SettingRow label="For dark backgrounds" hint="Used in the footer and mobile menu.">
                        <ImageUploader ratio="3/1" hint="White or light version, at least 480 × 160 px" className="max-w-sm" />
                    </SettingRow>
                    <SettingRow label="Browser tab icon" hint="Square, 512 × 512 px.">
                        <ImageUploader ratio="1/1" className="w-36" />
                    </SettingRow>
                </Panel>

                <Panel title="Name and tagline">
                    <SettingRow label="Site name" hint="Shown next to the logo when no logo is uploaded.">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={24}
                            className="h-11 w-full max-w-sm rounded-ctl border border-line bg-white px-3.5 text-[14px] outline-none focus:border-brand"
                        />
                    </SettingRow>
                    <SettingRow label="Tagline" hint="One line under the logo in the footer.">
                        <CharInput max={60} defaultValue={settings.tagline} className="max-w-lg" />
                    </SettingRow>
                </Panel>

                <Panel title="Brand colour" description="Used for buttons, links and highlights. Offers always stay amber.">
                    <div className="flex flex-wrap items-center gap-3">
                        {PRESETS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                aria-label={`Use ${c}`}
                                className={cn("grid h-11 w-11 place-items-center rounded-full ring-offset-2 transition", color === c ? "ring-2 ring-ink" : "hover:scale-105")}
                                style={{ background: c }}
                            >
                                {color === c && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                            </button>
                        ))}
                        <span className="mx-2 h-8 w-px bg-line" />
                        <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-white pl-1.5 pr-4">
                            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0" />
                            <span className="text-[14px] font-semibold uppercase text-ink tnum">{color}</span>
                        </label>
                    </div>
                </Panel>
            </div>

            <SaveBar>
                <Button variant="outline-light" size="sm">Discard</Button>
                <Button size="sm">Save changes</Button>
            </SaveBar>
        </div>
    );
}
