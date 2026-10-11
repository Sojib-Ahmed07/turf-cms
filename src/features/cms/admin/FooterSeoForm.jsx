// src/features/cms/admin/FooterSeoForm.jsx
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, Label, SaveBar } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import Button from "@/components/ui/Button";
import { CharInput, TextInput, Select } from "@/components/ui/Inputs";
import { SocialIcon } from "@/components/site/Footer";

export default function FooterSeoForm({ settings }) {
    const { contact, socials } = settings;
    const [title, setTitle] = useState("TurfZone — Book floodlit turf in Mirpur");
    const [desc, setDesc] = useState("Pick a ground, choose a slot and pay online in under a minute. Two FIFA-grade turfs in Mirpur 12, open till 3 am.");

    return (
        <div className="mx-auto max-w-[1080px]">
            <PageHeader title="Footer & SEO" description="Contact details, social links, and how the site appears on Google and when shared." />

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Contact details" description="Shown in the footer, the Find us section and the mobile menu.">
                    <div className="space-y-4">
                        <div>
                            <Label>Phone</Label>
                            <TextInput defaultValue={contact.phone} prefix="+880" />
                        </div>
                        <div>
                            <Label>Email</Label>
                            <TextInput type="email" defaultValue={contact.email} />
                        </div>
                        <div>
                            <Label>Address</Label>
                            <CharInput max={100} multiline rows={2} defaultValue={contact.address} />
                        </div>
                        <div>
                            <Label>Opening hours</Label>
                            <TextInput defaultValue={contact.hours} />
                        </div>
                        <div>
                            <Label>Google Maps link</Label>
                            <TextInput defaultValue="https://maps.app.goo.gl/turfzone" />
                        </div>
                    </div>
                </Panel>

                <Panel title="Social links" bodyClassName="p-4">
                    <ul className="space-y-2">
                        {socials.map((s) => (
                            <li key={s.platform} className="flex items-center gap-2">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl bg-pitch text-white">
                                    <SocialIcon name={s.platform} />
                                </span>
                                <div className="w-36 shrink-0">
                                    <Select defaultValue={s.platform} options={["facebook", "instagram", "youtube", "tiktok", "whatsapp"]} className="capitalize" />
                                </div>
                                <TextInput defaultValue={s.url} className="flex-1" />
                                <button type="button" aria-label="Remove link" className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl text-ink-3 hover:bg-danger-soft hover:text-danger">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-ctl border-2 border-dashed border-line py-3 text-[13px] font-semibold text-ink-3 hover:text-ink">
                        <Plus className="h-4 w-4" /> Add link
                    </button>
                </Panel>
            </div>

            <Panel className="mt-6" title="Search & sharing">
                <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                        <div>
                            <Label>Page title</Label>
                            <CharInput max={60} value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <CharInput max={160} multiline value={desc} onChange={(e) => setDesc(e.target.value)} />
                        </div>
                        <div>
                            <Label>Share image</Label>
                            <ImageUploader ratio="1200/630" hint="1200 × 630 px. Shown on Facebook, WhatsApp and Messenger." className="max-w-sm" />
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
                                    <span className="block text-[14px] text-[#202124]">TurfZone</span>
                                    <span className="block text-[12px] text-[#4d5156]">https://turfzone.com.bd</span>
                                </span>
                            </div>
                            <p className="mt-2 truncate text-[20px] leading-snug text-[#1a0dab]">{title}</p>
                            <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-[#4d5156]">{desc}</p>
                        </div>
                    </div>
                </div>
            </Panel>

            <SaveBar>
                <Button variant="outline-light" size="sm">Discard</Button>
                <Button size="sm">Save changes</Button>
            </SaveBar>
        </div>
    );
}
