// src/features/cms/admin/FooterSeoForm.jsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, Label, SaveBar } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import { CharInput, TextInput, Select } from "@/components/ui/Inputs";
import { SocialIcon } from "@/components/site/Footer";
import { saveFooterSeo } from "@/features/cms/actions/settings";

const PLATFORMS = [
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "tiktok", label: "TikTok" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "x", label: "X" },
    { value: "linkedin", label: "LinkedIn" },
];

/** initial: from getFooterSeoAdmin() -> { siteName, siteUrl, contact, socials, seo: { title, description, ogImage } } */
export default function FooterSeoForm({ initial }) {
    const router = useRouter();
    const pick = (d) => ({ contact: d.contact, socials: d.socials, seo: d.seo });
    const [form, setForm] = useState(() => pick(initial));
    const [saved, setSaved] = useState(() => pick(initial));
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();
    const { toast, showToast } = useToast();

    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
    const setContact = (patch) => {
        setError("");
        setForm((f) => ({ ...f, contact: { ...f.contact, ...patch } }));
    };
    const setSeo = (patch) => {
        setError("");
        setForm((f) => ({ ...f, seo: { ...f.seo, ...patch } }));
    };
    const setSocial = (i, patch) => {
        setError("");
        setForm((f) => ({ ...f, socials: f.socials.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
    };

    function save() {
        startTransition(async () => {
            const res = await saveFooterSeo(form);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setSaved(form);
            showToast("Footer and SEO saved");
            router.refresh();
        });
    }

    const previewTitle = form.seo.title || initial.siteName;
    const host = initial.siteUrl ? initial.siteUrl.replace(/^https?:\/\//, "") : "your-domain.com";

    return (
        <div className="mx-auto max-w-[1080px]">
            <PageHeader title="Footer & SEO" description="Contact details, social links, and how the site appears on Google and when shared." />

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Contact details" description="Shown in the footer, the Find us section, the mobile menu and payment pages.">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="c-phone">Phone</Label>
                            <TextInput id="c-phone" value={form.contact.phone} onChange={(e) => setContact({ phone: e.target.value })} placeholder="+880 1711 000000" maxLength={30} />
                        </div>
                        <div>
                            <Label htmlFor="c-email">Email</Label>
                            <TextInput id="c-email" type="email" value={form.contact.email} onChange={(e) => setContact({ email: e.target.value })} maxLength={80} />
                        </div>
                        <div>
                            <Label>Address</Label>
                            <CharInput max={100} multiline rows={2} value={form.contact.address} onChange={(e) => setContact({ address: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="c-hours">Opening hours</Label>
                            <TextInput id="c-hours" value={form.contact.hours} onChange={(e) => setContact({ hours: e.target.value })} placeholder="Every day, 6 am to 3 am" maxLength={60} />
                        </div>
                        <div>
                            <Label htmlFor="c-map">Google Maps link</Label>
                            <TextInput id="c-map" value={form.contact.mapUrl} onChange={(e) => setContact({ mapUrl: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
                        </div>
                    </div>
                </Panel>

                <Panel title="Social links" description="Icons in the footer." bodyClassName="p-4">
                    {form.socials.length === 0 && <p className="px-2 pb-3 text-[14px] text-ink-3">No social links yet.</p>}
                    <ul className="space-y-2">
                        {form.socials.map((s, i) => (
                            <li key={i} className="flex items-center gap-2">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl bg-pitch text-white">
                                    <SocialIcon name={s.platform} />
                                </span>
                                <div className="w-36 shrink-0">
                                    <Select value={s.platform} onChange={(e) => setSocial(i, { platform: e.target.value })} options={PLATFORMS} aria-label="Platform" />
                                </div>
                                <TextInput value={s.url} onChange={(e) => setSocial(i, { url: e.target.value })} placeholder="https://" className="flex-1" aria-label="Link" />
                                <button
                                    type="button"
                                    aria-label="Remove link"
                                    onClick={() => setForm((f) => ({ ...f, socials: f.socials.filter((_, j) => j !== i) }))}
                                    className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl text-ink-3 hover:bg-danger-soft hover:text-danger"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    {form.socials.length < 8 && (
                        <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, socials: [...f.socials, { platform: "facebook", url: "" }] }))}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-ctl border-2 border-dashed border-line py-3 text-[13px] font-semibold text-ink-3 hover:text-ink"
                        >
                            <Plus className="h-4 w-4" /> Add link
                        </button>
                    )}
                </Panel>
            </div>

            <Panel className="mt-6" title="Search & sharing">
                <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                        <div>
                            <Label optional>Page title</Label>
                            <CharInput max={60} value={form.seo.title} onChange={(e) => setSeo({ title: e.target.value })} placeholder={initial.siteName} />
                        </div>
                        <div>
                            <Label optional>Description</Label>
                            <CharInput max={160} multiline value={form.seo.description} onChange={(e) => setSeo({ description: e.target.value })} />
                        </div>
                        <div>
                            <Label optional>Share image</Label>
                            <ImageUploader
                                value={form.seo.ogImage}
                                onChange={(v) => setSeo({ ogImage: v })}
                                folder="seo"
                                ratio="1200/630"
                                hint="1200 × 630 px. Shown on Facebook, WhatsApp and Messenger."
                                className="max-w-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Google preview</Label>
                        <div className="rounded-ctl border border-line bg-white p-5" style={{ fontFamily: "arial, sans-serif" }}>
                            <div className="flex items-center gap-2.5">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-chalk ring-1 ring-line">
                                    <span className="h-3.5 w-3.5 rounded-[4px] bg-brand" />
                                </span>
                                <span>
                                    <span className="block text-[14px] text-[#202124]">{initial.siteName}</span>
                                    <span className="block text-[12px] text-[#4d5156]">https://{host}</span>
                                </span>
                            </div>
                            <p className="mt-2 truncate text-[20px] leading-snug text-[#1a0dab]">{previewTitle}</p>
                            <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-[#4d5156]">
                                {form.seo.description || "Add a description so Google shows your own words here."}
                            </p>
                        </div>
                    </div>
                </div>
            </Panel>

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
                    <Button size="sm" disabled={pending} onClick={save}>
                        {pending ? "Saving…" : "Save changes"}
                    </Button>
                </SaveBar>
            )}
            {toast}
        </div>
    );
}