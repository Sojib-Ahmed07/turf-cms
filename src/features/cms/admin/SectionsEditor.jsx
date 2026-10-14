// src/features/cms/admin/SectionsEditor.jsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { PageHeader, Panel, Label, SaveBar } from "@/components/admin/Kit";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { CharInput } from "@/components/ui/Inputs";
import { saveSections } from "@/features/cms/actions/sections";

const MAX_STEPS = 4;

/** initial: from getSectionsAdmin() -> { live_grounds, how_it_works, visit }, each with isVisible */
export default function SectionsEditor({ initial }) {
    const router = useRouter();
    const pick = (s) => ({
        live_grounds: { isVisible: s.live_grounds.isVisible, heading: s.live_grounds.heading, body: s.live_grounds.body },
        how_it_works: { isVisible: s.how_it_works.isVisible, heading: s.how_it_works.heading, steps: s.how_it_works.steps },
        visit: { isVisible: s.visit.isVisible, heading: s.visit.heading, body: s.visit.body, facilities: s.visit.facilities },
    });
    const [form, setForm] = useState(() => pick(initial));
    const [saved, setSaved] = useState(() => pick(initial));
    const [facility, setFacility] = useState("");
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();
    const { toast, showToast } = useToast();

    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
    const set = (key, patch) => {
        setError("");
        setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));
    };
    const setStep = (i, patch) =>
        set("how_it_works", { steps: form.how_it_works.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

    function addFacility() {
        const v = facility.trim().slice(0, 30);
        if (!v) return;
        if (!form.visit.facilities.some((f) => f.toLowerCase() === v.toLowerCase())) {
            set("visit", { facilities: [...form.visit.facilities, v] });
        }
        setFacility("");
    }

    function save() {
        startTransition(async () => {
            const res = await saveSections(form);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setSaved(form);
            showToast("Home sections saved");
            router.refresh();
        });
    }

    return (
        <div className="mx-auto max-w-[920px]">
            <PageHeader
                title="Home sections"
                description="Edit the text of each section on the home page, or hide a section. The layout stays the same."
            />

            <div className="space-y-6">
                <SectionCard
                    order="After the offer banner"
                    title="Grounds open today"
                    visible={form.live_grounds.isVisible}
                    onVisible={(v) => set("live_grounds", { isVisible: v })}
                >
                    <div>
                        <Label>Heading</Label>
                        <CharInput max={40} value={form.live_grounds.heading} onChange={(e) => set("live_grounds", { heading: e.target.value })} />
                    </div>
                    <div>
                        <Label optional>Text</Label>
                        <CharInput max={140} multiline rows={2} value={form.live_grounds.body} onChange={(e) => set("live_grounds", { body: e.target.value })} />
                    </div>
                    <p className="text-[13px] text-ink-3">Grounds, prices and free times come from Grounds &amp; slots.</p>
                </SectionCard>

                <SectionCard
                    order="After the grounds"
                    title="How it works"
                    visible={form.how_it_works.isVisible}
                    onVisible={(v) => set("how_it_works", { isVisible: v })}
                >
                    <div>
                        <Label>Heading</Label>
                        <CharInput max={60} value={form.how_it_works.heading} onChange={(e) => set("how_it_works", { heading: e.target.value })} />
                    </div>
                    <div className="space-y-3">
                        <Label>Steps</Label>
                        {form.how_it_works.steps.map((s, i) => (
                            <div key={i} className="grid gap-3 rounded-ctl bg-chalk p-4 sm:grid-cols-[28px_1fr_36px]">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[12px] font-bold text-white tnum">{i + 1}</span>
                                <div className="space-y-2.5">
                                    <CharInput max={24} value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} aria-label={`Step ${i + 1} title`} />
                                    <CharInput max={120} multiline rows={2} value={s.body} onChange={(e) => setStep(i, { body: e.target.value })} aria-label={`Step ${i + 1} text`} />
                                </div>
                                <button
                                    type="button"
                                    aria-label={`Remove step ${i + 1}`}
                                    disabled={form.how_it_works.steps.length <= 1}
                                    onClick={() => set("how_it_works", { steps: form.how_it_works.steps.filter((_, j) => j !== i) })}
                                    className="grid h-9 w-9 place-items-center rounded-ctl text-ink-3 hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        {form.how_it_works.steps.length < MAX_STEPS && (
                            <button
                                type="button"
                                onClick={() => set("how_it_works", { steps: [...form.how_it_works.steps, { title: "", body: "" }] })}
                                className="flex w-full items-center justify-center gap-2 rounded-ctl border-2 border-dashed border-line py-3 text-[13px] font-semibold text-ink-3 hover:text-ink"
                            >
                                <Plus className="h-4 w-4" /> Add a step
                            </button>
                        )}
                    </div>
                </SectionCard>

                <SectionCard order="Before the footer" title="Find us" visible={form.visit.isVisible} onVisible={(v) => set("visit", { isVisible: v })}>
                    <div>
                        <Label>Heading</Label>
                        <CharInput max={40} value={form.visit.heading} onChange={(e) => set("visit", { heading: e.target.value })} />
                    </div>
                    <div>
                        <Label optional>Text</Label>
                        <CharInput max={140} multiline rows={2} value={form.visit.body} onChange={(e) => set("visit", { body: e.target.value })} />
                    </div>
                    <div>
                        <Label optional>Facilities</Label>
                        <div className="flex flex-wrap gap-2 rounded-ctl border border-line bg-white p-2.5">
                            {form.visit.facilities.map((f) => (
                                <span key={f} className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1 text-[13px] font-semibold text-brand-deep">
                                    {f}
                                    <button
                                        type="button"
                                        aria-label={`Remove ${f}`}
                                        onClick={() => set("visit", { facilities: form.visit.facilities.filter((x) => x !== f) })}
                                        className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/70"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                            {form.visit.facilities.length < 12 && (
                                <input
                                    value={facility}
                                    onChange={(e) => setFacility(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === ",") {
                                            e.preventDefault();
                                            addFacility();
                                        }
                                    }}
                                    onBlur={addFacility}
                                    maxLength={30}
                                    placeholder="Add and press Enter"
                                    aria-label="Add a facility"
                                    className="min-w-[160px] flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-ink-4"
                                />
                            )}
                        </div>
                        <p className="mt-2 text-[12px] text-ink-3">Address, hours and phone come from Footer &amp; SEO.</p>
                    </div>
                </SectionCard>

                <p className="flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-line py-5 text-[13px] font-semibold text-ink-4">
                    <Plus className="h-4 w-4" />
                    New section types are added by your developer
                </p>
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
                    <Button size="sm" disabled={pending} onClick={save}>
                        {pending ? "Saving…" : "Save sections"}
                    </Button>
                </SaveBar>
            )}
            {toast}
        </div>
    );
}

function SectionCard({ order, title, visible, onVisible, children }) {
    return (
        <Panel
            title={title}
            description={visible ? order : `${order}. Hidden on the website.`}
            actions={
                <label className="flex items-center gap-2.5 text-[13px] font-semibold text-ink-2">
                    Visible
                    <Switch checked={visible} onChange={onVisible} label={`Show ${title}`} />
                </label>
            }
        >
            <div className={visible ? "space-y-5" : "space-y-5 opacity-60"}>{children}</div>
        </Panel>
    );
}