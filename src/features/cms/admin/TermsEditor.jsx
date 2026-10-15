// src/features/cms/admin/TermsEditor.jsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, Label, SaveBar, OrderButtons } from "@/components/admin/Kit";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import { CharInput } from "@/components/ui/Inputs";
import { saveTerms } from "@/features/cms/actions/sections";

const MAX_ITEMS = 20;

/** initial: from getTermsAdmin() -> { heading, intro, items: [{ title, body }], updated } */
export default function TermsEditor({ initial }) {
    const router = useRouter();
    const pick = (t) => ({ heading: t.heading, intro: t.intro, items: t.items.map((i) => ({ title: i.title, body: i.body })) });
    const [form, setForm] = useState(() => pick(initial));
    const [saved, setSaved] = useState(() => pick(initial));
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();
    const { toast, showToast } = useToast();

    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
    const set = (patch) => {
        setError("");
        setForm((f) => ({ ...f, ...patch }));
    };
    const setItem = (i, patch) => set({ items: form.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
    const move = (i, dir) => {
        const items = [...form.items];
        const j = i + dir;
        [items[i], items[j]] = [items[j], items[i]];
        set({ items });
    };

    function save() {
        startTransition(async () => {
            const res = await saveTerms(form);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setSaved(form);
            showToast("Booking terms saved");
            router.refresh();
        });
    }

    return (
        <div className="mx-auto max-w-[920px]">
            <PageHeader
                title="Booking terms"
                description="The rules players agree to when they book. Shown on the Booking terms page, linked from the footer."
                actions={
                    <Button href="/terms" target="_blank" rel="noreferrer" variant="outline" size="sm">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View page
                    </Button>
                }
            />

            {!initial.updated && (
                <p className="mb-6 rounded-card bg-flare-soft px-5 py-4 text-[14px] text-ink-2 ring-1 ring-flare/50">
                    This is a starting draft based on how booking works on the site. Check every section (cancellation notice,
                    refund time, ground rules) matches your venue, then save.
                </p>
            )}

            <div className="space-y-6">
                <Panel title="Page" description={initial.updated ? `Last saved ${initial.updated}` : "Not saved yet"}>
                    <div className="space-y-5">
                        <div>
                            <Label htmlFor="t-heading">Title</Label>
                            <CharInput id="t-heading" max={60} value={form.heading} onChange={(e) => set({ heading: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="t-intro" optional>
                                Intro
                            </Label>
                            <CharInput id="t-intro" max={300} multiline rows={2} value={form.intro} onChange={(e) => set({ intro: e.target.value })} />
                        </div>
                    </div>
                </Panel>

                <Panel title="Sections" description="Numbered on the page in this order. Leave a blank line in the text to start a new paragraph.">
                    <div className="space-y-3">
                        {form.items.map((item, i) => (
                            <div key={i} className="grid gap-3 rounded-ctl bg-chalk p-4 sm:grid-cols-[28px_1fr_36px]">
                                <div className="flex items-center gap-2 sm:flex-col sm:items-center">
                                    <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[12px] font-bold text-white tnum">{i + 1}</span>
                                    <OrderButtons onMove={(d) => move(i, d)} first={i === 0} last={i === form.items.length - 1} label={`section ${i + 1}`} />
                                </div>
                                <div className="space-y-2.5">
                                    <CharInput max={80} value={item.title} onChange={(e) => setItem(i, { title: e.target.value })} aria-label={`Section ${i + 1} title`} placeholder="Section title" />
                                    <CharInput
                                        max={1500}
                                        multiline
                                        rows={4}
                                        value={item.body}
                                        onChange={(e) => setItem(i, { body: e.target.value })}
                                        aria-label={`Section ${i + 1} text`}
                                        placeholder="What players need to know"
                                    />
                                </div>
                                <button
                                    type="button"
                                    aria-label={`Remove section ${i + 1}`}
                                    disabled={form.items.length <= 1}
                                    onClick={() => set({ items: form.items.filter((_, j) => j !== i) })}
                                    className="grid h-9 w-9 place-items-center rounded-ctl text-ink-3 hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        {form.items.length < MAX_ITEMS && (
                            <button
                                type="button"
                                onClick={() => set({ items: [...form.items, { title: "", body: "" }] })}
                                className="flex w-full items-center justify-center gap-2 rounded-ctl border-2 border-dashed border-line py-3 text-[13px] font-semibold text-ink-3 hover:text-ink"
                            >
                                <Plus className="h-4 w-4" /> Add a section
                            </button>
                        )}
                    </div>
                    <p className="mt-4 text-[12px] text-ink-3">The phone number and email under the terms come from Footer &amp; SEO.</p>
                </Panel>
            </div>

            {(dirty || !initial.updated) && (
                <SaveBar error={error} message={dirty ? "You have unsaved changes" : "The site shows this starting draft until you save"}>
                    {dirty && (
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
                    )}
                    <Button size="sm" disabled={pending} onClick={save}>
                        {pending ? "Saving…" : "Save terms"}
                    </Button>
                </SaveBar>
            )}
            {toast}
        </div>
    );
}