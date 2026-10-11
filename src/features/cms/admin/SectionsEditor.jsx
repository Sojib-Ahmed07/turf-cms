// src/features/cms/admin/SectionsEditor.jsx
"use client";

import { Plus, X } from "lucide-react";
import { PageHeader, Panel, Label, SaveBar } from "@/components/admin/Kit";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { CharInput } from "@/components/ui/Inputs";

/** One card per fixed home section: show/hide + its text. */
export default function SectionsEditor({ sections }) {
    const { live_grounds, how_it_works, visit } = sections;

    return (
        <div className="mx-auto max-w-[920px]">
            <PageHeader
                title="Home sections"
                description="Edit the text of each section on the home page, or hide a section. The layout stays the same."
            />

            <div className="space-y-6">
                <SectionCard order="After the offer banner" title="Grounds open today">
                    <div>
                        <Label>Heading</Label>
                        <CharInput max={40} defaultValue={live_grounds.heading} />
                    </div>
                    <div>
                        <Label>Text</Label>
                        <CharInput max={140} multiline rows={2} defaultValue={live_grounds.body} />
                    </div>
                    <p className="text-[13px] text-ink-3">Grounds, prices and free times come from Grounds &amp; slots.</p>
                </SectionCard>

                <SectionCard order="After the grounds" title="How it works">
                    <div>
                        <Label>Heading</Label>
                        <CharInput max={60} defaultValue={how_it_works.heading} />
                    </div>
                    <div className="space-y-3">
                        <Label>Steps</Label>
                        {how_it_works.steps.map((s, i) => (
                            <div key={i} className="grid gap-3 rounded-ctl bg-chalk p-4 sm:grid-cols-[28px_1fr]">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[12px] font-bold text-white tnum">{i + 1}</span>
                                <div className="space-y-2.5">
                                    <CharInput max={24} defaultValue={s.title} />
                                    <CharInput max={120} multiline rows={2} defaultValue={s.body} />
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard order="Before the footer" title="Find us">
                    <div>
                        <Label>Heading</Label>
                        <CharInput max={40} defaultValue={visit.heading} />
                    </div>
                    <div>
                        <Label>Text</Label>
                        <CharInput max={140} multiline rows={2} defaultValue={visit.body} />
                    </div>
                    <div>
                        <Label>Facilities</Label>
                        <div className="flex flex-wrap gap-2 rounded-ctl border border-line bg-white p-2.5">
                            {visit.facilities.map((f) => (
                                <span key={f} className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1 text-[13px] font-semibold text-brand-deep">
                                    {f}
                                    <button type="button" aria-label={`Remove ${f}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/70">
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                            <input placeholder="Add and press Enter" className="min-w-[160px] flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-ink-4" />
                        </div>
                        <p className="mt-2 text-[12px] text-ink-3">Address, hours and phone come from Footer &amp; SEO.</p>
                    </div>
                </SectionCard>

                <button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-line py-5 text-[13px] font-semibold text-ink-4">
                    <Plus className="h-4 w-4" />
                    New section types are added by your developer
                </button>
            </div>

            <SaveBar>
                <Button variant="outline-light" size="sm">Discard</Button>
                <Button size="sm">Save sections</Button>
            </SaveBar>
        </div>
    );
}

function SectionCard({ order, title, children }) {
    return (
        <Panel
            title={title}
            description={order}
            actions={
                <label className="flex items-center gap-2.5 text-[13px] font-semibold text-ink-2">
                    Visible
                    <Switch defaultChecked label={`Show ${title}`} />
                </label>
            }
        >
            <div className="space-y-5">{children}</div>
        </Panel>
    );
}
