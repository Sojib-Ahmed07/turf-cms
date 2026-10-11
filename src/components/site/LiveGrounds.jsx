// src/components/site/LiveGrounds.jsx
import Image from "next/image";
import Link from "next/link";
import { Ruler, Layers } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn, taka, time12 } from "@/lib/utils";

/** Home section: first ground featured, the rest as compact rows. */
export default function LiveGrounds({ content, pitches = [] }) {
    const [featured, ...rest] = pitches;

    return (
        <section id="grounds" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                    <h2 className="display text-[clamp(36px,5vw,64px)] text-ink">{content.heading}</h2>
                    <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-3">{content.body}</p>
                </div>
                <Button href="/book" variant="outline" size="lg">
                    See the full schedule
                </Button>
            </div>

            {pitches.length === 0 ? (
                <div className="mt-12 rounded-card border-2 border-dashed border-line p-12 text-center">
                    <p className="display text-2xl text-ink">No grounds listed yet</p>
                    <p className="mt-2 text-ink-3">Add a ground from the admin panel and it will show up here.</p>
                </div>
            ) : (
                <div className="mt-12 grid gap-4 lg:grid-cols-12">
                    {/* Featured */}
                    <article className="group overflow-hidden rounded-card bg-white ring-1 ring-line lg:col-span-7">
                        <div className="relative aspect-[16/10] overflow-hidden bg-pitch">
                            <Image
                                src={featured.imageUrl}
                                alt={featured.name}
                                fill
                                sizes="(min-width:1024px) 58vw, 100vw"
                                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-pitch/90 via-pitch/10 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 sm:p-8">
                                <div>
                                    <p className="text-[14px] font-semibold text-white/75">{featured.format}</p>
                                    <h3 className="display mt-1 text-[clamp(36px,4.6vw,56px)] text-white">{featured.name}</h3>
                                </div>
                                <p className="shrink-0 rounded-full bg-white px-4 py-2 text-[15px] font-bold text-ink tnum">
                                    {taka(featured.hourlyRate)}
                                    <span className="font-medium text-ink-3"> /hr</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                            <Specs pitch={featured} />
                            <FreeTimes pitch={featured} />
                        </div>
                    </article>

                    {/* Others */}
                    <div className="flex flex-col gap-4 lg:col-span-5">
                        {rest.map((p) => (
                            <article key={p.id} className="group flex flex-1 gap-5 rounded-card bg-white p-4 ring-1 ring-line sm:p-5">
                                <div className="relative w-28 shrink-0 overflow-hidden rounded-[14px] bg-pitch sm:w-40">
                                    <Image src={p.imageUrl} alt={p.name} fill sizes="160px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 py-1">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                        <div>
                                            <h3 className="display text-[24px] text-ink sm:text-[26px]">{p.name}</h3>
                                            <p className="mt-1 text-[13px] text-ink-3">
                                                {p.format}, {p.size}
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-[15px] font-bold text-ink tnum">
                                            {taka(p.hourlyRate)}
                                            <span className="font-medium text-ink-3">/hr</span>
                                        </p>
                                    </div>
                                    <FreeTimes pitch={p} compact />
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

function Specs({ pitch }) {
    return (
        <dl className="flex gap-6 text-[14px]">
            <div className="flex items-center gap-2 text-ink-2">
                <Ruler className="h-4 w-4 text-ink-4" />
                <dt className="sr-only">Size</dt>
                <dd>{pitch.size}</dd>
            </div>
            <div className="flex items-center gap-2 text-ink-2">
                <Layers className="h-4 w-4 text-ink-4" />
                <dt className="sr-only">Surface</dt>
                <dd>{pitch.surface}</dd>
            </div>
        </dl>
    );
}

function FreeTimes({ pitch, compact = false }) {
    const times = pitch.freeTonight ?? [];
    if (!times.length) {
        return <p className="text-[13px] font-medium text-ink-3">Fully booked tonight</p>;
    }
    return (
        <div>
            {!compact && <p className="mb-2 text-xs font-medium text-ink-3">Free tonight</p>}
            <ul className="flex flex-wrap gap-1.5">
                {times.slice(0, compact ? 3 : 4).map((t) => (
                    <li key={t}>
                        <Link
                            href={`/book?pitch=${pitch.id}&t=${t}`}
                            className={cn(
                                "inline-flex rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand-deep tnum",
                                "ring-1 ring-inset ring-transparent transition hover:bg-brand hover:text-brand-ink"
                            )}
                        >
                            {time12(t)}
                        </Link>
                    </li>
                ))}
                {compact && times.length > 3 && (
                    <li className="px-2 py-1.5 text-[13px] font-medium text-ink-3">+{times.length - 3} more</li>
                )}
            </ul>
        </div>
    );
}
