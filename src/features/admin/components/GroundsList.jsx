// src/features/admin/components/GroundsList.jsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock3, Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/admin/Kit";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import PitchLines from "@/components/site/PitchLines";
import PitchForm, { EMPTY_PITCH } from "./PitchForm";
import { togglePitchActive } from "@/features/admin/actions/pitches";
import { canOptimize, cn, taka, time12 } from "@/lib/utils";
import { BN } from "@/i18n/format";

/** /admin/pitches — ground cards (prototype: PitchesManager list). */
export default function GroundsList({ pitches = [] }) {
    const router = useRouter();
    const [editing, setEditing] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");
    const [, startTransition] = useTransition();

    function toggle(id) {
        setError("");
        setBusyId(id);
        startTransition(async () => {
            const res = await togglePitchActive(id);
            setBusyId(null);
            if (!res.ok) setError(res.error);
            router.refresh();
        });
    }

    const openCount = pitches.filter((p) => p.isActive).length;

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="মাঠ ও স্লট"
                description={`মোট ${BN.digits(pitches.length)}টি মাঠ, এর মধ্যে ${BN.digits(openCount)}টিতে বুকিং চালু। প্রতিটি মাঠের নিজস্ব ছবি, দাম আর প্রতিদিনের স্লট আছে।`}
                actions={
                    <Button variant="ink" onClick={() => setEditing({ ...EMPTY_PITCH })}>
                        <Plus className="h-4 w-4" />
                        মাঠ যোগ করুন
                    </Button>
                }
            />

            {error && <p className="mb-6 rounded-ctl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">{error}</p>}

            {pitches.length === 0 ? (
                <div className="rounded-card border-2 border-dashed border-line px-6 py-16 text-center">
                    <p className="display text-[28px] text-ink">এখনো কোনো মাঠ নেই</p>
                    <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-3">বুকিং নেওয়া শুরু করতে প্রথম মাঠটি যোগ করুন।</p>
                    <Button className="mt-6" onClick={() => setEditing({ ...EMPTY_PITCH })}>
                        <Plus className="h-4 w-4" />
                        মাঠ যোগ করুন
                    </Button>
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {pitches.map((p) => (
                        <article key={p.id} className={cn("overflow-hidden rounded-card bg-white ring-1 ring-line", !p.isActive && "opacity-75")}>
                            <div className="relative aspect-[16/9] bg-pitch">
                                {p.imageUrl ? (
                                    <Image src={p.imageUrl} alt="" fill sizes="420px" unoptimized={!canOptimize(p.imageUrl)} className="object-cover" />
                                ) : (
                                    <PitchLines className="absolute inset-0 h-full w-full text-white/15" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-pitch/85 to-transparent" />
                                <div className="absolute bottom-4 left-5 text-white">
                                    <p className="text-[13px] text-white/70">{p.format || p.sport}</p>
                                    <p className="display text-[30px]">{p.name}</p>
                                </div>
                                <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/95 py-1 pl-3 pr-1 text-[12px] font-semibold text-ink">
                                    {p.isActive ? "বুকিং চালু" : "বুকিং বন্ধ"}
                                    <Switch
                                        size="sm"
                                        checked={p.isActive}
                                        onChange={() => busyId !== p.id && toggle(p.id)}
                                        label={`${p.name}-এ বুকিং চালু`}
                                    />
                                </div>
                            </div>

                            <dl className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
                                {p.pricing === "per_person" ? (
                                    <Stat label={`জনপ্রতি, সর্বোচ্চ ${BN.digits(p.capacity ?? 20)} জন`} value={`${taka(p.hourlyRate)}/ঘণ্টা`} />
                                ) : (
                                    <Stat label="প্রতি ঘণ্টার দাম" value={`${taka(p.hourlyRate)}/ঘণ্টা`} />
                                )}
                                <Stat label="দিনে স্লট" value={BN.digits(p.blockCount)} />
                                <Stat label="প্রতি স্লট" value={`${BN.digits(p.defaultSlotMinutes)} মিনিট`} />
                            </dl>

                            <div className="flex items-center justify-between gap-3 p-4">
                                <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {p.firstStart && p.lastEnd ? `${time12(p.firstStart)} থেকে ${time12(p.lastEnd)}` : "এখনো কোনো স্লট নেই"}
                                </p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                        বদলান
                                    </Button>
                                    <Button size="sm" variant="ink" href={`/admin/pitches/${p.id}`}>
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                        স্লট বদলান
                                    </Button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <PitchForm pitch={editing} onClose={() => setEditing(null)} />
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="px-3 py-4">
            <dt className="text-[11px] font-medium text-ink-3">{label}</dt>
            <dd className="mt-1 text-[15px] font-bold text-ink tnum">{value}</dd>
        </div>
    );
}