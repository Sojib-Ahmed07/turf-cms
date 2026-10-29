// src/components/site/Footer.jsx
import Link from "next/link";
import Logo from "./Logo";
import FooterCta from "./FooterCta";
import PitchLines from "./PitchLines";
import SocialIcon from "./SocialIcon";
import { getI18n } from "@/i18n/server";
import { navLabel } from "@/i18n/nav";

const PAY_METHODS = ["bKash", "Nagad", "Rocket", "Visa", "Mastercard", "Amex"];

export default async function Footer({ settings, items = [], signedIn = false }) {
    const { t } = await getI18n();
    const { contact, socials = [] } = settings;
    const year = new Date().getFullYear();

    return (
        <footer className="px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="relative overflow-hidden rounded-frame bg-pitch text-white">
                <PitchLines className="absolute inset-0 h-full w-full text-white/[0.06]" />

                <FooterCta />

                <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-14 sm:px-10 lg:grid-cols-12 lg:px-12">
                    <div className="col-span-2 lg:col-span-4">
                        <Logo settings={settings} tone="light" homeLabel={t("common.homeOf", { name: settings.siteName })} />
                        {settings.tagline && (
                            <p className="mt-4 max-w-[30ch] text-[15px] leading-relaxed text-white/60">{settings.tagline}</p>
                        )}
                        <ul className="mt-6 flex gap-2">
                            {socials.map((s) => (
                                <li key={s.url}>
                                    <a
                                        href={s.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={s.platform}
                                        className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-white/80 ring-1 ring-inset ring-white/10 transition hover:bg-white hover:text-pitch"
                                    >
                                        <SocialIcon name={s.platform} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <FooterCol title={t("footer.explore")} className="lg:col-span-2">
                        {items.map((i) => (
                            <li key={i.id ?? i.href}>
                                <Link href={i.href} className="hover:text-white">
                                    {navLabel(i)}
                                </Link>
                            </li>
                        ))}
                    </FooterCol>

                    <FooterCol title={t("footer.account")} className="lg:col-span-2">
                        <li><Link href="/bookings" className="hover:text-white">{t("common.myBookings")}</Link></li>
                        <li><Link href="/profile" className="hover:text-white">{t("common.profile")}</Link></li>
                        {!signedIn && <li><Link href="/login" className="hover:text-white">{t("common.signIn")}</Link></li>}
                        <li><Link href="/terms" className="hover:text-white">{t("footer.terms")}</Link></li>
                    </FooterCol>

                    <FooterCol title={t("footer.visit")} className="col-span-2 lg:col-span-4">
                        {contact.address && <li>{contact.address}</li>}
                        {contact.hours && <li>{contact.hours}</li>}
                        {contact.phone && (
                            <li>
                                <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-white">
                                    {contact.phone}
                                </a>
                            </li>
                        )}
                        {contact.email && (
                            <li>
                                <a href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</a>
                            </li>
                        )}
                    </FooterCol>
                </div>

                <div className="relative mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 px-6 py-6 text-[13px] text-white/50 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
                    <p>{t("footer.rights", { year, site: settings.siteName })}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1">{t("footer.payWith")}</span>
                        {PAY_METHODS.map((m) => (
                            <span key={m} className="rounded-md bg-white/8 px-2 py-1 text-[12px] font-semibold text-white/75 ring-1 ring-inset ring-white/10">
                                {m}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterCol({ title, className, children }) {
    return (
        <div className={className}>
            <h3 className="text-[13px] font-semibold text-white">{title}</h3>
            <ul className="mt-4 space-y-2.5 text-[15px] text-white/60">{children}</ul>
        </div>
    );
}

/** Minimal brand glyphs (lucide no longer ships brand icons). */