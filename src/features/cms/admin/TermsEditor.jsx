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
            showToast("বুকিংয়ের নিয়ম সেভ হয়েছে");
            router.refresh();
        });
    }

    return (
        <div className="mx-auto max-w-[920px]">
            <PageHeader
                title="বুকিংয়ের নিয়ম"
                description="বুক করার সময় খেলোয়াড়রা যে নিয়ম মেনে নেন। “বুকিংয়ের নিয়ম” পেজে দেখাবে, ফুটারে তার লিংক আছে।"
                actions={
                    <Button href="/terms" target="_blank" rel="noreferrer" variant="outline" size="sm">
                        <ExternalLink className="h-3.5 w-3.5" />
                        পেজটি দেখুন
                    </Button>
                }
            />

            {!initial.updated && (
                <p className="mb-6 rounded-card bg-flare-soft px-5 py-4 text-[14px] text-ink-2 ring-1 ring-flare/50">
                    এটি সাইটের বুকিং যেভাবে কাজ করে তার ওপর ভিত্তি করে লেখা একটি শুরুর খসড়া। প্রতিটি অংশ (ক্যানসেলের নোটিশ,
                    টাকা ফেরতের সময়, মাঠের নিয়ম) আপনার মাঠের সাথে মিলছে কি না দেখে নিন, তারপর সেভ করুন।
                </p>
            )}

            <div className="space-y-6">
                <Panel title="পেজ" description={initial.updated ? `শেষ সেভ: ${initial.updated}` : "এখনো সেভ করা হয়নি"}>
                    <div className="space-y-5">
                        <div>
                            <Label htmlFor="t-heading">শিরোনাম</Label>
                            <CharInput id="t-heading" max={60} value={form.heading} onChange={(e) => set({ heading: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="t-intro" optional>
                                শুরুর লেখা
                            </Label>
                            <CharInput id="t-intro" max={300} multiline rows={2} value={form.intro} onChange={(e) => set({ intro: e.target.value })} />
                        </div>
                    </div>
                </Panel>

                <Panel title="অংশগুলো" description="পেজে এই ক্রমে নম্বর দিয়ে দেখাবে। নতুন প্যারাগ্রাফ শুরু করতে লেখার মাঝে একটি খালি লাইন রাখুন।">
                    <div className="space-y-3">
                        {form.items.map((item, i) => (
                            <div key={i} className="grid gap-3 rounded-ctl bg-chalk p-4 sm:grid-cols-[28px_1fr_36px]">
                                <div className="flex items-center gap-2 sm:flex-col sm:items-center">
                                    <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[12px] font-bold text-white tnum">{i + 1}</span>
                                    <OrderButtons onMove={(d) => move(i, d)} first={i === 0} last={i === form.items.length - 1} label={`section ${i + 1}`} />
                                </div>
                                <div className="space-y-2.5">
                                    <CharInput max={80} value={item.title} onChange={(e) => setItem(i, { title: e.target.value })} aria-label={`অংশ ${i + 1}-এর শিরোনাম`} placeholder="অংশের শিরোনাম" />
                                    <CharInput
                                        max={1500}
                                        multiline
                                        rows={4}
                                        value={item.body}
                                        onChange={(e) => setItem(i, { body: e.target.value })}
                                        aria-label={`অংশ ${i + 1}-এর লেখা`}
                                        placeholder="খেলোয়াড়দের যা জানা দরকার"
                                    />
                                </div>
                                <button
                                    type="button"
                                    aria-label={`অংশ ${i + 1} সরান`}
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
                                <Plus className="h-4 w-4" /> একটি অংশ যোগ করুন
                            </button>
                        )}
                    </div>
                    <p className="mt-4 text-[12px] text-ink-3">নিয়মের নিচের ফোন নম্বর আর ইমেইল আসে “যোগাযোগ, ফুটার ও SEO” পেজ থেকে।</p>
                </Panel>
            </div>

            {(dirty || !initial.updated) && (
                <SaveBar error={error} message={dirty ? "পরিবর্তন এখনো সেভ হয়নি" : "সেভ না করা পর্যন্ত সাইটে এই শুরুর খসড়াটি দেখাবে"}>
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
                            বাদ দিন
                        </Button>
                    )}
                    <Button size="sm" disabled={pending} onClick={save}>
                        {pending ? "সেভ হচ্ছে…" : "নিয়ম সেভ করুন"}
                    </Button>
                </SaveBar>
            )}
            {toast}
        </div>
    );
}