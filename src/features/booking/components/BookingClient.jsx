// src/features/booking/components/BookingClient.jsx
"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import PitchPicker from "./PitchPicker";
import DateStrip from "./DateStrip";
import SlotBoard from "./SlotBoard";
import BookingSummary from "./BookingSummary";
import PromoBanner from "@/components/site/PromoBanner";
import Button from "@/components/ui/Button";
import { taka, time12 } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BookingClient({ pitches, blocks, banner, startDate }) {
    const [pitchId, setPitchId] = useState(pitches[0]?.id);
    const [dayIndex, setDayIndex] = useState(0);
    const [blockId, setBlockId] = useState(null);

    const pitch = pitches.find((p) => p.id === pitchId);
    const block = blocks.find((b) => b.id === blockId);

    const start = new Date(`${startDate}T00:00:00`);
    const date = new Date(start);
    date.setDate(date.getDate() + dayIndex);
    const dateLabel = `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;

    return (
        <div className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-24">
            <header className="mb-10 max-w-2xl">
                <h1 className="display text-[clamp(40px,6vw,72px)] text-ink">Book a slot</h1>
                <p className="mt-3 text-[16px] text-ink-3">Prices change with the time of day. Every price includes floodlights and the changing room.</p>
            </header>

            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="space-y-10 lg:col-span-8">
                    <Step n={1} title="Ground">
                        <PitchPicker pitches={pitches} value={pitchId} onChange={setPitchId} />
                    </Step>

                    <Step n={2} title="Date">
                        <DateStrip start={start} value={dayIndex} onChange={setDayIndex} />
                    </Step>

                    <Step n={3} title="Time">
                        {banner && <PromoBanner banner={banner} variant="inline" className="mb-6" />}
                        <SlotBoard blocks={blocks} selectedId={blockId} onSelect={setBlockId} />
                    </Step>
                </div>

                <div className="hidden lg:col-span-4 lg:block">
                    <div className="sticky top-24">
                        <BookingSummary pitch={pitch} dateLabel={dateLabel} block={block} />
                    </div>
                </div>
            </div>

            {/* Mobile checkout bar */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                <div className="mx-auto flex max-w-xl items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink-3">
                            {block ? `${pitch?.name}, ${dateLabel}, ${time12(block.start)}` : "No slot selected"}
                        </p>
                        <p className="display text-[24px] text-ink tnum">{taka(block?.price ?? 0)}</p>
                    </div>
                    <Button size="lg" disabled={!block}>
                        <Lock className="h-4 w-4" />
                        Continue
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Step({ n, title, children }) {
    return (
        <section>
            <h2 className="mb-4 flex items-center gap-3 text-[15px] font-semibold text-ink">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-bold text-white tnum">{n}</span>
                {title}
            </h2>
            {children}
        </section>
    );
}
