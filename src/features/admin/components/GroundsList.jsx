// src/features/admin/components/GroundsList.jsx
// Ground overview cards. Plug your prototype's SlotEditor into "Edit slots".
import Image from "next/image";
import { Clock3, Plus, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/admin/Kit";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { taka } from "@/lib/utils";

export default function GroundsList({ pitches = [] }) {
    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Grounds & slots"
                description="Each ground has its own photo, price and daily time blocks."
                actions={
                    <Button variant="ink">
                        <Plus className="h-4 w-4" />
                        Add ground
                    </Button>
                }
            />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {pitches.map((p) => (
                    <article key={p.id} className="overflow-hidden rounded-card bg-white ring-1 ring-line">
                        <div className="relative aspect-[16/9] bg-pitch">
                            <Image src={p.imageUrl} alt="" fill sizes="420px" className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-pitch/80 to-transparent" />
                            <div className="absolute bottom-4 left-5 text-white">
                                <p className="text-[13px] text-white/70">{p.format}</p>
                                <p className="display text-[30px]">{p.name}</p>
                            </div>
                            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/95 py-1 pl-3 pr-1 text-[12px] font-semibold text-ink">
                                Open for booking
                                <Switch size="sm" defaultChecked label={`${p.name} open for booking`} />
                            </div>
                        </div>
                        <dl className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
                            <div className="px-3 py-4">
                                <dt className="text-[11px] font-medium text-ink-3">Base price</dt>
                                <dd className="mt-1 text-[15px] font-bold text-ink tnum">{taka(p.hourlyRate)}/hr</dd>
                            </div>
                            <div className="px-3 py-4">
                                <dt className="text-[11px] font-medium text-ink-3">Slots a day</dt>
                                <dd className="mt-1 text-[15px] font-bold text-ink tnum">14</dd>
                            </div>
                            <div className="px-3 py-4">
                                <dt className="text-[11px] font-medium text-ink-3">Size</dt>
                                <dd className="mt-1 text-[15px] font-bold text-ink tnum">{p.size}</dd>
                            </div>
                        </dl>
                        <div className="flex items-center justify-between gap-3 p-4">
                            <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
                                <Clock3 className="h-3.5 w-3.5" />6 am to 3 am
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm">Edit</Button>
                                <Button size="sm" variant="ink">
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    Edit slots
                                </Button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
