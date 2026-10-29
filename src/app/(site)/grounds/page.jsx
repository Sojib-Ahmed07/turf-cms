// src/app/(site)/grounds/page.jsx
// /grounds: every open ground with its specs, real starting price and today's free times.
import Link from "next/link";
import { Clock, Layers, Ruler } from "lucide-react";
import Button from "@/components/ui/Button";
import GroundPhoto from "@/components/site/GroundPhoto";
import { getGroundsToday } from "@/features/booking/queries";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    const { t } = await getI18n();
    return { title: t("groundsPage.title"), description: t("groundsPage.intro") };
}

export default async function GroundsPage() {
    const i18n = await getI18n();
    const { date, pitches } = await getGroundsToday();
    const { t } = i18n;

    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
            <header className="max-w-2xl">
                <h1 className="display text-[clamp(40px,6vw,72px)] text-ink">{t("groundsPage.title")}</h1>
                <p className="mt-3 text-[16px] leading-relaxed text-ink-3">{t("groundsPage.intro")}</p>
            </header>

            {pitches.length === 0 ? (
                <div className="mt-12 rounded-card border-2 border-dashed border-line p-12 text-center">
                    <p className="display text-2xl text-ink">{t("groundsPage.noneTitle")}</p>
                    <p className="mt-2 text-ink-3">{t("groundsPage.noneBody")}</p>
                </div>
            ) : (
                <div className="mt-12 grid gap-6 md:grid-cols-2">
                    {pitches.map((p) => (
                        <GroundCard key={p.id} pitch={p} date={date} i18n={i18n} />
                    ))}
                </div>
            )}
        </div>
    );
}

/** "from ৳1,000/hr" chip on the ground photos. */
function PricePill({ pitch, t, f }) {
    return (
        <p className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-[15px] font-bold leading-none text-ink tnum">
            <span className="text-[12px] font-medium text-ink-3">{t("groundsPage.from")}</span>
            <span>
                {f.taka(pitch.fromHourly)}
                <span className="font-medium text-ink-3">{t("common.perHour")}</span>
            </span>
        </p>
    );
}

function GroundCard({ pitch: p, date, i18n: { t, f } }) {
    const free = p.freeToday ?? [];
    const status = !p.slotsToday ? t("groundsPage.closedToday") : free.length ? t("groundsPage.freeToday", { count: free.length }) : t("groundsPage.fullToday");
    const href = `/grounds/${p.slug}`;
    return (
        <article className="group flex flex-col overflow-hidden rounded-card bg-white ring-1 ring-line">
            <Link href={href} className="relative block aspect-[16/9] overflow-hidden bg-pitch" aria-label={p.name}>
                <GroundPhoto pitch={p} sizes="(min-width:768px) 50vw, 100vw" className="transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-pitch/85 via-pitch/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    {p.format && <p className="text-[14px] font-semibold text-white/75">{p.format}</p>}
                    {/* Name and price share one row, centred on each other (Bangla headings sit taller than Latin ones) */}
                    <div className="mt-1 flex items-center justify-between gap-4">
                        <h2 className="display min-w-0 truncate pb-[0.06em] text-[clamp(30px,3.6vw,44px)] text-white">{p.name}</h2>
                        <PricePill pitch={p} t={t} f={f} />
                    </div>
                </div>
            </Link>

            <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                {p.description && <p className="text-[15px] leading-relaxed text-ink-2">{p.description}</p>}

                <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2">
                    {p.size && (
                        <div className="flex items-center gap-2">
                            <Ruler className="h-4 w-4 text-ink-4" />
                            <dt className="sr-only">{t("grounds.size")}</dt>
                            <dd>{p.size}</dd>
                        </div>
                    )}
                    {p.surface && (
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-ink-4" />
                            <dt className="sr-only">{t("grounds.surface")}</dt>
                            <dd>{p.surface}</dd>
                        </div>
                    )}
                    {p.opensAt && (
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-ink-4" />
                            <dt className="sr-only">{t("groundsPage.hours")}</dt>
                            <dd className="tnum">
                                {f.time(p.opensAt)} – {f.time(p.closesAt)}
                            </dd>
                        </div>
                    )}
                </dl>

                <div>
                    <p className={cn("text-[13px] font-semibold", free.length ? "text-brand-deep" : "text-ink-3")}>{status}</p>
                    {free.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                            {free.slice(0, 6).map((hhmm) => (
                                <li key={hhmm}>
                                    <Link
                                        href={`/book?pitch=${p.id}&date=${date}&t=${hhmm}`}
                                        className="inline-flex rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand-deep tnum transition hover:bg-brand hover:text-brand-ink"
                                    >
                                        {f.time(hhmm)}
                                    </Link>
                                </li>
                            ))}
                            {free.length > 6 && (
                                <li className="px-2 py-1.5 text-[13px] font-medium text-ink-3">{t("grounds.more", { count: free.length - 6 })}</li>
                            )}
                        </ul>
                    )}
                </div>

                <div className="mt-auto grid gap-2 pt-1 sm:grid-cols-2">
                    <Button href={`/book?pitch=${p.id}`} className="w-full">
                        {t("groundsPage.book")}
                    </Button>
                    <Button href={href} variant="outline" className="w-full">
                        {t("groundsPage.seeTimes")}
                    </Button>
                </div>
            </div>
        </article>
    );
}