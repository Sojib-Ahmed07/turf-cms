// src/features/cms/admin/BrandingForm.jsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, MapPin, Ticket } from "lucide-react";
import { PageHeader, Panel, SettingRow, SaveBar } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import { CharInput, TextInput } from "@/components/ui/Inputs";
import { Mark } from "@/components/site/Logo";
import { saveBranding } from "@/features/cms/actions/settings";
import { canOptimize, cn } from "@/lib/utils";

const PRESETS = ["#18a058", "#0e7c66", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0f172a"];

/** initial: from getBrandingAdmin() */
export default function BrandingForm({ initial }) {
    const router = useRouter();
    const [form, setForm] = useState(initial);
    const [saved, setSaved] = useState(initial);
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();
    const { toast, showToast } = useToast();

    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
    const set = (patch) => {
        setForm((f) => ({ ...f, ...patch }));
        setError("");
    };
    const setMap = (patch) => {
        setForm((f) => ({ ...f, map: { ...f.map, ...patch } }));
        setError("");
    };
    const validHex = /^#[0-9a-fA-F]{6}$/.test(form.brandColor);

    function save() {
        startTransition(async () => {
            const res = await saveBranding(form);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setSaved(form);
            showToast("Branding saved. The website shows it now.");
            router.refresh();
        });
    }

    return (
        <div className="mx-auto max-w-[1080px]" style={validHex ? { "--brand": form.brandColor } : undefined}>
            <PageHeader title="Branding" description="Your logo, name, brand colour and map location. Changes show on every page of the website." />

            {/* Live preview */}
            <div className="mb-6 overflow-hidden rounded-card bg-chalk ring-1 ring-line">
                <p className="border-b border-line bg-white px-5 py-2.5 text-[12px] font-medium text-ink-3">Live preview</p>
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className="flex items-center gap-2.5">
                        {form.logoLight?.url ? (
                            <span className="relative block h-9 w-[160px]">
                                <Image src={form.logoLight.url} alt={form.siteName} fill sizes="160px" unoptimized={!canOptimize(form.logoLight.url)} className="object-contain object-left" />
                            </span>
                        ) : (
                            <>
                                <Mark className="h-9 w-9" />
                                <span className="display text-[20px] text-ink">{form.siteName || "Site name"}</span>
                            </>
                        )}
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
                    <Button size="sm">{initial.menuButtonLabel || "Book a slot"}</Button>
                </div>
            </div>

            <div className="space-y-6">
                <Panel title="Logo" description="PNG or SVG with a transparent background works best. Without a logo, the site name and a small pitch icon are shown.">
                    <SettingRow label="For light backgrounds" hint="Used in the menu bar.">
                        <ImageUploader
                            value={form.logoLight}
                            onChange={(v) => set({ logoLight: v })}
                            folder="branding"
                            fit="contain"
                            ratio="3/1"
                            hint="At least 480 × 160 px"
                            className="max-w-sm"
                        />
                    </SettingRow>
                    <SettingRow label="For dark backgrounds" hint="Used in the footer and mobile menu.">
                        <ImageUploader
                            value={form.logoDark}
                            onChange={(v) => set({ logoDark: v })}
                            folder="branding"
                            fit="contain"
                            dark
                            ratio="3/1"
                            hint="White or light version, at least 480 × 160 px. Previewed on the dark footer colour."
                            className="max-w-sm"
                        />
                    </SettingRow>
                    <SettingRow label="Browser tab icon" hint="Square, 512 × 512 px. PNG or ICO.">
                        <ImageUploader value={form.favicon} onChange={(v) => set({ favicon: v })} folder="branding" fit="contain" ratio="1/1" className="w-36" />
                    </SettingRow>
                </Panel>

                <Panel title="Name and tagline">
                    <SettingRow label="Site name" hint="Shown next to the logo when no logo is uploaded, and in page titles.">
                        <CharInput max={24} value={form.siteName} onChange={(e) => set({ siteName: e.target.value })} className="max-w-sm" />
                    </SettingRow>
                    <SettingRow label="Tagline" hint="One line under the logo in the footer.">
                        <CharInput max={60} value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} className="max-w-lg" />
                    </SettingRow>
                </Panel>

                <Panel title="Brand colour" description="Used for buttons, links and highlights. Offers always stay amber.">
                    <div className="flex flex-wrap items-center gap-3">
                        {PRESETS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => set({ brandColor: c })}
                                aria-label={`Use ${c}`}
                                className={cn(
                                    "grid h-11 w-11 place-items-center rounded-full ring-offset-2 transition",
                                    form.brandColor.toLowerCase() === c ? "ring-2 ring-ink" : "hover:scale-105"
                                )}
                                style={{ background: c }}
                            >
                                {form.brandColor.toLowerCase() === c && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                            </button>
                        ))}
                        <span className="mx-2 h-8 w-px bg-line" />
                        <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-white pl-1.5 pr-2">
                            <input
                                type="color"
                                value={validHex ? form.brandColor : "#18a058"}
                                onChange={(e) => set({ brandColor: e.target.value })}
                                aria-label="Pick any colour"
                                className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                            />
                            <input
                                value={form.brandColor}
                                onChange={(e) => set({ brandColor: e.target.value.trim() })}
                                maxLength={7}
                                aria-label="Colour code"
                                className="w-20 bg-transparent text-[14px] font-semibold uppercase text-ink outline-none tnum"
                            />
                        </label>
                    </div>
                    {!validHex && <p className="mt-3 text-[13px] font-medium text-danger">Type the colour as # and six characters, for example #18A058.</p>}
                </Panel>

                <Panel
                    title="Map location"
                    description="Shown on the home page in the Find us section. Get coordinates from Google Maps: right-click the spot, then click the numbers to copy. Leave latitude and longitude empty to show the illustrated map instead."
                >
                    <SettingRow label="Latitude" hint="For example 23.8223 (between −90 and 90).">
                        <TextInput
                            value={form.map.lat}
                            onChange={(e) => setMap({ lat: e.target.value })}
                            placeholder="23.8223"
                            inputMode="decimal"
                            className="max-w-xs tnum"
                        />
                    </SettingRow>
                    <SettingRow label="Longitude" hint="For example 90.3654 (between −180 and 180).">
                        <TextInput
                            value={form.map.lng}
                            onChange={(e) => setMap({ lng: e.target.value })}
                            placeholder="90.3654"
                            inputMode="decimal"
                            className="max-w-xs tnum"
                        />
                    </SettingRow>
                    <SettingRow label="Zoom" hint="2 (whole world) to 19 (street level). Leave empty for 16.">
                        <TextInput
                            value={form.map.zoom}
                            onChange={(e) => setMap({ zoom: e.target.value })}
                            placeholder="16"
                            inputMode="numeric"
                            className="max-w-[120px] tnum"
                        />
                    </SettingRow>
                    <SettingRow label="Marker label" hint="Shown in the popup when the marker is clicked. Empty uses the site name.">
                        <CharInput max={40} value={form.map.label} onChange={(e) => setMap({ label: e.target.value })} placeholder="TurfZone, Mirpur 12" className="max-w-md" />
                    </SettingRow>
                    <SettingRow label="Marker address" hint="Optional second line in the popup.">
                        <CharInput max={120} value={form.map.address} onChange={(e) => setMap({ address: e.target.value })} placeholder="Road 7, Mirpur 12, Dhaka" className="max-w-lg" />
                    </SettingRow>
                    <SettingRow label="Find coordinates" hint="Opens Google Maps in a new tab. Nothing is saved from there.">
                        <Button
                            href="https://www.google.com/maps"
                            variant="outline"
                            size="sm"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <MapPin className="h-4 w-4" />
                            Open Google Maps
                        </Button>
                    </SettingRow>
                </Panel>
            </div>

            {dirty && (
                <SaveBar error={error}>
                    <Button
                        variant="outline-light"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                            setForm(saved);
                            setError("");
                        }}
                    >
                        Discard
                    </Button>
                    <Button size="sm" disabled={pending || !validHex} onClick={save}>
                        {pending ? "Saving…" : "Save changes"}
                    </Button>
                </SaveBar>
            )}
            {toast}
        </div>
    );
}