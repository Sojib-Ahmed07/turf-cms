// src/components/site/LiveGrounds.jsx
import Link from "next/link";
import { Ruler, Layers } from "lucide-react";
import Button from "@/components/ui/Button";
import GroundPhoto from "./GroundPhoto";
import { cn } from "@/lib/utils";
import { getI18n } from "@/i18n/server";

/**
 * Home section: first ground featured, the rest as compact rows.
 * pitches come from getGroundsToday(): each has freeToday = ["19:30", ...] for `date`.
 */
export default async function LiveGrounds({ content, pitches = [], date }) {
    const i18n = await getI18n();
    const { t, f } = i18n;
    const [featured, ...rest] = pitches;

    return (
        <section id="grounds" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                    <h2 className="display text-[clamp(36px,5vw,64px)] text-ink">{content.heading}</h2>
                    {content.body && (
                        <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-3">{content.body}</p>
                    )}
                </div>
                <Button href="/grounds" variant="outline" size="lg">
                    {t("grounds.seeSchedule")}
                </Button>
            </div>

            {pitches.length === 0 ? (
                <div className="mt-12 rounded-card border-2 border-dashed border-line p-12 text-center">
                    <p className="display text-2xl text-ink">{t("grounds.noneTitle")}</p>
                    <p className="mt-2 text-ink-3">{t("grounds.noneBody")}</p>
                </div>
            ) : (
                <div className="mt-12 grid gap-4 lg:grid-cols-12">
                    {/* Featured */}
                    <article className="group overflow-hidden rounded-card bg-white ring-1 ring-line lg:col-span-7">
                        <div className="relative aspect-[16/10] overflow-hidden bg-pitch">
                            <GroundPhoto
                                pitch={featured}
                                sizes="(min-width:1024px) 58vw, 100vw"
                                className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-pitch/90 via-pitch/10 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                                {featured.format && <p className="text-[14px] font-semibold text-white/75">{featured.format}</p>}
                                <div className="mt-1 flex items-center justify-between gap-4">
                                    <h3 className="display min-w-0 truncate pb-[0.06em] text-[clamp(36px,4.6vw,56px)] text-white">{featured.name}</h3>
                                    <p className="shrink-0 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-[15px] font-bold leading-none text-ink tnum">
                                        {f.taka(featured.fromHourly)}
                                        <span className="font-medium text-ink-3">{t("common.perHour")}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                            <Specs pitch={featured} i18n={i18n} />
                            <FreeTimes pitch={featured} date={date} i18n={i18n} />
                        </div>
                    </article>

                    {/* Others */}
                    <div className="flex flex-col gap-4 lg:col-span-5">
                        {rest.map((p) => (
                            <article key={p.id} className="group flex flex-1 gap-5 rounded-card bg-white p-4 ring-1 ring-line sm:p-5">
                                <div className="relative w-28 shrink-0 overflow-hidden rounded-[14px] bg-pitch sm:w-40">
                                    <GroundPhoto pitch={p} sizes="160px" className="transition-transform duration-700 group-hover:scale-105" />
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 py-1">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                        <div>
                                            <h3 className="display text-[24px] text-ink sm:text-[26px]">{p.name}</h3>
                                            <p className="mt-1 text-[13px] text-ink-3">
                                                {[p.format, p.size].filter(Boolean).join(", ")}
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-[15px] font-bold text-ink tnum">
                                            {f.taka(p.fromHourly)}
                                            <span className="font-medium text-ink-3">{t("common.perHour")}</span>
                                        </p>
                                    </div>
                                    <FreeTimes pitch={p} date={date} compact i18n={i18n} />
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

function Specs({ pitch, i18n: { t } }) {
    if (!pitch.size && !pitch.surface) return <div />;
    return (
        <dl className="flex gap-6 text-[14px]">
            {pitch.size && (
                <div className="flex items-center gap-2 text-ink-2">
                    <Ruler className="h-4 w-4 text-ink-4" />
                    <dt className="sr-only">{t("grounds.size")}</dt>
                    <dd>{pitch.size}</dd>
                </div>
            )}
            {pitch.surface && (
                <div className="flex items-center gap-2 text-ink-2">
                    <Layers className="h-4 w-4 text-ink-4" />
                    <dt className="sr-only">{t("grounds.surface")}</dt>
                    <dd>{pitch.surface}</dd>
                </div>
            )}
        </dl>
    );
}

function FreeTimes({ pitch, date, compact = false, i18n: { t, f } }) {
    const times = pitch.freeToday ?? [];
    if (!times.length) {
        return (
            <Link href={`/book?pitch=${pitch.id}`} className="text-[13px] font-medium text-ink-3 hover:text-ink">
                {t("grounds.noFreeToday")}
            </Link>
        );
    }
    const dateParam = date ? `&date=${date}` : "";
    return (
        <div>
            {!compact && <p className="mb-2 text-xs font-medium text-ink-3">{t("grounds.stillFree")}</p>}
            <ul className="flex flex-wrap gap-1.5">
                {times.slice(0, compact ? 3 : 4).map((hhmm) => (
                    <li key={hhmm}>
                        <Link
                            href={`/book?pitch=${pitch.id}${dateParam}&t=${hhmm}`}
                            className={cn(
                                "inline-flex rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand-deep tnum",
                                "ring-1 ring-inset ring-transparent transition hover:bg-brand hover:text-brand-ink"
                            )}
                        >
                            {f.time(hhmm)}
                        </Link>
                    </li>
                ))}
                {times.length > (compact ? 3 : 4) && (
                    <li className="px-2 py-1.5 text-[13px] font-medium text-ink-3">
                        {t("grounds.more", { count: times.length - (compact ? 3 : 4) })}
                    </li>
                )}
            </ul>
        </div>
    );
}