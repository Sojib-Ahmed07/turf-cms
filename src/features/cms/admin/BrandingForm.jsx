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
            let next = form;
            if (res.data?.renamed) {
                next = { ...form, tagline: res.data.tagline ?? "", map: { ...form.map, label: res.data.mapLabel ?? "" } };
                setForm(next);
            }
            setSaved(next);
            showToast(res.data?.renamed ? "সেভ হয়েছে। সব লেখায় নতুন নাম বসানো হয়েছে।" : "সেভ হয়েছে। ওয়েবসাইটে এখনই দেখা যাচ্ছে।");
            router.refresh();
        });
    }

    return (
        <div className="mx-auto max-w-[1080px]" style={validHex ? { "--brand": form.brandColor } : undefined}>
            <PageHeader title="লোগো ও রং" description="আপনার লোগো, নাম, রং আর ম্যাপে মাঠের লোকেশন। এখানে যা বদলাবেন, ওয়েবসাইটের সব পেজে দেখা যাবে।" />

            {/* Live preview */}
            <div className="mb-6 overflow-hidden rounded-card bg-chalk ring-1 ring-line">
                <p className="border-b border-line bg-white px-5 py-2.5 text-[12px] font-medium text-ink-3">যেমন দেখাবে</p>
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className="flex items-center gap-2.5">
                        {form.logoLight?.url ? (
                            <span className="relative block h-9 w-[160px]">
                                <Image src={form.logoLight.url} alt={form.siteName} fill sizes="160px" unoptimized={!canOptimize(form.logoLight.url)} className="object-contain object-left" />
                            </span>
                        ) : (
                            <>
                                <Mark className="h-9 w-9" />
                                <span className="display text-[20px] text-ink">{form.siteName || "সাইটের নাম"}</span>
                            </>
                        )}
                    </span>
                    <span className="ml-auto hidden items-center gap-5 text-[14px] text-ink-3 md:flex">
                        <span className="relative font-medium text-ink">
                            হোম
                            <span className="absolute inset-x-0 -bottom-[17px] h-[3px] rounded-t-full bg-brand" />
                        </span>
                        <span>স্লট বুক করুন</span>
                        <span>মাঠ</span>
                    </span>
                    <span className="hidden items-center gap-1.5 text-[14px] text-ink-2 sm:flex">
                        <Ticket className="h-4 w-4" /> আমার বুকিং
                    </span>
                    <Button size="sm">{initial.menuButtonLabel || "স্লট বুক করুন"}</Button>
                </div>
            </div>

            <div className="space-y-6">
                <Panel title="লোগো" description="স্বচ্ছ ব্যাকগ্রাউন্ডের PNG বা SVG সবচেয়ে ভালো। লোগো না দিলে সাইটের নাম আর ছোট একটি মাঠের আইকন দেখাবে।">
                    <SettingRow label="সাদা/হালকা ব্যাকগ্রাউন্ডের জন্য" hint="ওপরের মেনুতে দেখাবে।">
                        <ImageUploader
                            value={form.logoLight}
                            onChange={(v) => set({ logoLight: v })}
                            folder="branding"
                            fit="contain"
                            ratio="3/1"
                            hint="কমপক্ষে ৪৮০ × ১৬০ পিক্সেল"
                            className="max-w-sm"
                        />
                    </SettingRow>
                    <SettingRow label="গাঢ় ব্যাকগ্রাউন্ডের জন্য" hint="ফুটার আর মোবাইল মেনুতে দেখাবে।">
                        <ImageUploader
                            value={form.logoDark}
                            onChange={(v) => set({ logoDark: v })}
                            folder="branding"
                            fit="contain"
                            dark
                            ratio="3/1"
                            hint="সাদা বা হালকা রঙের লোগো, কমপক্ষে ৪৮০ × ১৬০ পিক্সেল। ফুটারের গাঢ় রঙের ওপর দেখানো হচ্ছে।"
                            className="max-w-sm"
                        />
                    </SettingRow>
                    <SettingRow label="ব্রাউজার ট্যাবের আইকন" hint="বর্গাকার, ৫১২ × ৫১২ পিক্সেল। PNG বা ICO।">
                        <ImageUploader value={form.favicon} onChange={(v) => set({ favicon: v })} folder="branding" fit="contain" ratio="1/1" className="w-36" />
                    </SettingRow>
                </Panel>

                <Panel title="নাম ও ট্যাগলাইন">
                    <SettingRow label="সাইটের নাম" hint="লোগো না থাকলে লোগোর জায়গায় দেখাবে, আর ব্রাউজারের ট্যাবে পেজের নামের সাথে থাকবে। নাম বদলালে গুগলের শিরোনাম, ম্যাপের নাম, অফার, হোম পেজ, মাঠের বিবরণ আর বুকিংয়ের নিয়মে পুরনো নামটিও নিজে থেকে নতুন নাম হয়ে যাবে।">
                        <CharInput max={24} value={form.siteName} onChange={(e) => set({ siteName: e.target.value })} className="max-w-sm" />
                    </SettingRow>
                    <SettingRow label="ট্যাগলাইন" hint="ফুটারে লোগোর নিচে এক লাইনের লেখা।">
                        <CharInput max={60} value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} className="max-w-lg" />
                    </SettingRow>
                </Panel>

                <Panel title="মূল রং" description="বাটন, লিংক আর হাইলাইটে এই রং ব্যবহার হবে। অফারগুলো সবসময় কমলা থাকবে।">
                    <div className="flex flex-wrap items-center gap-3">
                        {PRESETS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => set({ brandColor: c })}
                                aria-label={`${c} রং নিন`}
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
                                aria-label="যেকোনো রং বেছে নিন"
                                className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                            />
                            <input
                                value={form.brandColor}
                                onChange={(e) => set({ brandColor: e.target.value.trim() })}
                                maxLength={7}
                                aria-label="রঙের কোড"
                                className="w-20 bg-transparent text-[14px] font-semibold uppercase text-ink outline-none tnum"
                            />
                        </label>
                    </div>
                    {!validHex && <p className="mt-3 text-[13px] font-medium text-danger">রঙের কোড # এবং ছয়টি অক্ষর দিয়ে লিখুন, যেমন #18A058।</p>}
                </Panel>

                <Panel
                    title="ম্যাপে লোকেশন"
                    description="হোম পেজের “ঠিকানা” অংশে ম্যাপে দেখাবে। Google Maps থেকে লোকেশন নিন: জায়গাটির ওপর রাইট-ক্লিক করুন, তারপর সংখ্যাগুলোতে ক্লিক করলে কপি হয়ে যাবে। ল্যাটিচিউড আর লঞ্জিচিউড খালি রাখলে ম্যাপের জায়গায় একটি আঁকা ছবি দেখাবে।"
                >
                    <SettingRow label="ল্যাটিচিউড" hint="যেমন 23.8223 (−90 থেকে 90-এর মধ্যে)।">
                        <TextInput
                            value={form.map.lat}
                            onChange={(e) => setMap({ lat: e.target.value })}
                            placeholder="23.8223"
                            inputMode="decimal"
                            className="max-w-xs tnum"
                        />
                    </SettingRow>
                    <SettingRow label="লঞ্জিচিউড" hint="যেমন 90.3654 (−180 থেকে 180-এর মধ্যে)।">
                        <TextInput
                            value={form.map.lng}
                            onChange={(e) => setMap({ lng: e.target.value })}
                            placeholder="90.3654"
                            inputMode="decimal"
                            className="max-w-xs tnum"
                        />
                    </SettingRow>
                    <SettingRow label="জুম" hint="২ (পুরো পৃথিবী) থেকে ১৯ (রাস্তা পর্যন্ত)। খালি রাখলে ১৬।">
                        <TextInput
                            value={form.map.zoom}
                            onChange={(e) => setMap({ zoom: e.target.value })}
                            placeholder="16"
                            inputMode="numeric"
                            className="max-w-[120px] tnum"
                        />
                    </SettingRow>
                    <SettingRow label="পিনের নাম" hint="ম্যাপের পিনে চাপ দিলে দেখাবে। খালি রাখলে সাইটের নাম দেখাবে।">
                        <CharInput max={40} value={form.map.label} onChange={(e) => setMap({ label: e.target.value })} placeholder={`${form.siteName || "সাইটের নাম"}, মিরপুর ১২`} className="max-w-md" />
                    </SettingRow>
                    <SettingRow label="পিনের ঠিকানা" hint="পিনে চাপ দিলে নামের নিচে দেখাবে (ঐচ্ছিক)।">
                        <CharInput max={120} value={form.map.address} onChange={(e) => setMap({ address: e.target.value })} placeholder="রোড ৭, মিরপুর ১২, ঢাকা" className="max-w-lg" />
                    </SettingRow>
                    <SettingRow label="লোকেশন খুঁজুন" hint="নতুন ট্যাবে Google Maps খুলবে। সেখান থেকে কিছু সেভ হয় না।">
                        <Button
                            href="https://www.google.com/maps"
                            variant="outline"
                            size="sm"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <MapPin className="h-4 w-4" />
                            Google Maps খুলুন
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
                        বাদ দিন
                    </Button>
                    <Button size="sm" disabled={pending || !validHex} onClick={save}>
                        {pending ? "সেভ হচ্ছে…" : "সেভ করুন"}
                    </Button>
                </SaveBar>
            )}
            {toast}
        </div>
    );
}