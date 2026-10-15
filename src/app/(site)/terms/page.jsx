// src/app/(site)/terms/page.jsx
import { Mail, Phone } from "lucide-react";
import Button from "@/components/ui/Button";
import { getSiteSettings, getTerms } from "@/features/cms/queries";

export async function generateMetadata() {
    const terms = await getTerms();
    return { title: terms.heading, description: terms.intro || undefined };
}

/** "A\n\nB" -> ["A", "B"]: blank lines start a new paragraph, single line breaks are kept. */
const paragraphs = (body) =>
    body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

export default async function TermsPage() {
    const [terms, settings] = await Promise.all([getTerms(), getSiteSettings()]);
    const { phone, email } = settings.contact;

    return (
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
            <header className="max-w-3xl">
                <h1 className="display text-[clamp(40px,6vw,72px)] text-ink">{terms.heading}</h1>
                {terms.intro && <p className="mt-3 text-[16px] leading-relaxed text-ink-3">{terms.intro}</p>}
                {terms.updated && <p className="mt-4 text-[13px] font-medium text-ink-4">Last updated {terms.updated}</p>}
            </header>

            <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
                {terms.items.length > 2 && (
                    <nav aria-label="On this page" className="hidden lg:col-span-4 lg:block">
                        <div className="sticky top-28 rounded-card bg-white p-5 ring-1 ring-line">
                            <p className="text-[13px] font-semibold text-ink-3">On this page</p>
                            <ol className="mt-3 space-y-1">
                                {terms.items.map((item, i) => (
                                    <li key={i}>
                                        <a
                                            href={`#term-${i + 1}`}
                                            className="flex gap-3 rounded-ctl px-2 py-1.5 text-[14px] text-ink-2 transition-colors hover:bg-chalk hover:text-ink"
                                        >
                                            <span className="w-5 shrink-0 text-ink-4 tnum">{i + 1}</span>
                                            {item.title}
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </nav>
                )}

                <div className={terms.items.length > 2 ? "lg:col-span-8" : "lg:col-span-12 lg:max-w-3xl"}>
                    <ol className="space-y-4">
                        {terms.items.map((item, i) => (
                            <li key={i} id={`term-${i + 1}`} className="scroll-mt-28 rounded-card bg-white p-6 ring-1 ring-line sm:p-8">
                                <div className="flex items-start gap-4">
                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pitch text-[13px] font-bold text-white tnum">
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0 pt-0.5">
                                        <h2 className="text-[19px] font-semibold text-ink">{item.title}</h2>
                                        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-2">
                                            {paragraphs(item.body).map((p, j) => (
                                                <p key={j} className="whitespace-pre-line">
                                                    {p}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>

                    {(phone || email) && (
                        <div className="mt-8 flex flex-col gap-4 rounded-card bg-pitch p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
                            <div>
                                <p className="text-[17px] font-semibold">Questions about a booking?</p>
                                <p className="mt-1 text-[14px] text-white/60">Call or email us and we&apos;ll sort it out.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {phone && (
                                    <Button href={`tel:${phone.replace(/[^\d+]/g, "")}`} variant="white" size="sm">
                                        <Phone className="h-3.5 w-3.5" />
                                        {phone}
                                    </Button>
                                )}
                                {email && (
                                    <Button href={`mailto:${email}`} variant="outline-light" size="sm">
                                        <Mail className="h-3.5 w-3.5" />
                                        {email}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}