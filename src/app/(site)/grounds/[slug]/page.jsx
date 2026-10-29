// src/app/(site)/grounds/[slug]/page.jsx
// One ground: photo, specs, real starting price, the next 7 days at a glance and today's free times.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Layers, Ruler, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import GroundPhoto from "@/components/site/GroundPhoto";
import { getGroundDays, getPitchBySlug, toPitchView } from "@/features/booking/queries";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const row = await getPitchBySlug(slug);
    const { t } = await getI18n();
    if (!row) return { title: t("groundsPage.notFound") };
    const p = toPitchView(row);
    return { title: p.name, description: p.description || undefined };
}

export default async function GroundPage({ params }) {
    const { slug } = await params;
    const row = await getPitchBySlug(slug);
    if (!row) notFound();

    const [days, i18n] = await Promise.all([getGroundDays(row, 7), getI18n()]);
    const { t, f } = i18n;
    const p = toPitchView(row);
    const today = days[0];
    // Today when something is left, otherwise the first day that has free times.
    const shown = today?.free ? today : (days.find((d) => d.free) ?? today);

    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10 lg:px-8">
            <Link href="/grounds" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-3 hover:text-ink">
                <ArrowLeft className="h-4 w-4" />
                {t("groundsPage.allGrounds")}
            </Link>

            <div className="relative mt-5 aspect-[16/9] overflow-hidden rounded-card bg-pitch sm:aspect-[21/9]">
                <GroundPhoto pitch={p} sizes="(min-width:1280px) 1216px, 100vw" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-pitch/85 via-pitch/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                    {p.format && <p className="text-[15px] font-semibold text-white/75">{p.format}</p>}
                    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="display min-w-0 pb-[0.06em] text-[clamp(40px,6vw,72px)] text-white">{p.name}</h1>
                        <p className="self-start whitespace-nowrap rounded-full bg-white px-4 py-2 text-[16px] font-bold text-ink tnum sm:self-auto">
                            <span className="font-medium text-ink-3">{t("groundsPage.from")} </span>
                            {f.taka(p.fromHourly)}
                            <span className="font-medium text-ink-3">{t("common.perHour")}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="space-y-10 lg:col-span-8">
                    {p.description && <p className="max-w-[62ch] text-[17px] leading-relaxed text-ink-2">{p.description}</p>}

                    <section>
                        <h2 className="display text-[28px] text-ink">{t("groundsPage.nextDays")}</h2>
                        <p className="mt-1 text-[14px] text-ink-3">{t("groundsPage.nextDaysHint")}</p>
                        <ul className="mt-5 grid grid-cols-4 gap-2 lg:grid-cols-7">
                            {days.map((d, i) => (
                                <li key={d.date}>
                                    <Link
                                        href={`/book?pitch=${p.id}&date=${d.date}`}
                                        className={cn(
                                            "flex h-full flex-col rounded-[16px] p-2.5 ring-1 transition-colors sm:p-3",
                                            d.free ? "bg-white ring-line hover:ring-ink-4" : "bg-chalk ring-line/60"
                                        )}
                                    >
                                        <span className="text-[12px] font-semibold text-ink-2">{i === 0 ? t("common.today") : f.dayShort(dowOf(d.date))}</span>
                                        <span className="text-[12px] text-ink-3">{f.dayMonth(d.date)}</span>
                                        <span className={cn("mt-1 text-[13px] font-bold tnum sm:text-[15px]", d.free ? "text-brand-deep" : "text-ink-4")}>
                                            {!d.slots ? t("groundsPage.noSlots") : d.free ? t("groundsPage.freeCount", { count: d.free }) : t("groundsPage.full")}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h2 className="display text-[28px] text-ink">
                            {shown === today ? t("groundsPage.freeTimes") : t("groundsPage.freeTimesOn", { date: f.date(shown.date) })}
                        </h2>
                        {shown?.free ? (
                            <ul className="mt-5 flex flex-wrap gap-2">
                                {shown.times.map((hhmm) => (
                                    <li key={hhmm}>
                                        <Link
                                            href={`/book?pitch=${p.id}&date=${shown.date}&t=${hhmm}`}
                                            className="inline-flex rounded-full bg-brand-soft px-4 py-2 text-[14px] font-semibold text-brand-deep tnum transition hover:bg-brand hover:text-brand-ink"
                                        >
                                            {f.time(hhmm)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-3 text-[15px] text-ink-3">{t("groundsPage.noneLeft")}</p>
                        )}
                    </section>
                </div>

                <aside className="lg:col-span-4">
                    <div className="sticky top-24 rounded-card bg-white p-6 ring-1 ring-line">
                        <dl className="space-y-4 text-[15px]">
                            {p.format && <Spec icon={Users} label={t("groundsPage.format")} value={p.format} />}
                            {p.size && <Spec icon={Ruler} label={t("grounds.size")} value={p.size} />}
                            {p.surface && <Spec icon={Layers} label={t("grounds.surface")} value={p.surface} />}
                            {p.opensAt && (
                                <Spec icon={Clock} label={t("groundsPage.hours")} value={`${f.time(p.opensAt)} – ${f.time(p.closesAt)}`} />
                            )}
                        </dl>
                        <Button href={`/book?pitch=${p.id}`} size="lg" className="mt-6 w-full">
                            {t("groundsPage.book")}
                        </Button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

/** "2026-10-30" -> 0 (Sunday) to 6. */
function dowOf(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function Spec({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
            <div>
                <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
                <dd className="font-semibold text-ink tnum">{value}</dd>
            </div>
        </div>
    );
}