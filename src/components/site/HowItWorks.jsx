// src/components/site/HowItWorks.jsx
import { CalendarCheck, ShieldCheck, Ticket } from "lucide-react";
import { getI18n } from "@/i18n/server";

const ICONS = [CalendarCheck, ShieldCheck, Ticket];

/** Three-step sequence drawn along a touchline. */
export default async function HowItWorks({ content }) {
    const { t } = await getI18n();
    return (
        <section className="border-y border-line bg-white">
            <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-12 lg:px-8">
                <div className="lg:col-span-5">
                    <h2 className="display text-[clamp(36px,4.8vw,60px)] text-ink lg:sticky lg:top-28">{content.heading}</h2>
                </div>

                <ol className="relative lg:col-span-6 lg:col-start-7">
                    {/* touchline */}
                    <span aria-hidden="true" className="absolute bottom-10 left-[23px] top-10 w-[2px] bg-[repeating-linear-gradient(to_bottom,var(--color-line)_0_10px,transparent_10px_18px)]" />
                    {content.steps.map((step, i) => {
                        const Icon = ICONS[i] ?? CalendarCheck;
                        return (
                            <li key={step.title} className="relative flex gap-6 pb-12 last:pb-0">
                                <span className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pitch text-white ring-8 ring-white">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div className="pt-1">
                                    <p className="text-[13px] font-semibold text-brand-deep tnum">{t("how.step", { n: i + 1 })}</p>
                                    <h3 className="display mt-1 text-[28px] text-ink">{step.title}</h3>
                                    <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-ink-3">{step.body}</p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}