// src/components/site/Footer.jsx
import Link from "next/link";
import Logo from "./Logo";
import FooterCta from "./FooterCta";
import PitchLines from "./PitchLines";

const PAY_METHODS = ["bKash", "Nagad", "Rocket", "Visa", "Mastercard", "Amex"];

export default function Footer({ settings, items = [] }) {
    const { contact, socials = [] } = settings;
    const year = new Date().getFullYear();

    return (
        <footer className="px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="relative overflow-hidden rounded-frame bg-pitch text-white">
                <PitchLines className="absolute inset-0 h-full w-full text-white/[0.06]" />

                <FooterCta />

                <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-14 sm:px-10 lg:grid-cols-12 lg:px-12">
                    <div className="col-span-2 lg:col-span-4">
                        <Logo settings={settings} tone="light" />
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

                    <FooterCol title="Explore" className="lg:col-span-2">
                        {items.map((i) => (
                            <li key={i.id ?? i.href}>
                                <Link href={i.href} className="hover:text-white">
                                    {i.label}
                                </Link>
                            </li>
                        ))}
                    </FooterCol>

                    <FooterCol title="Account" className="lg:col-span-2">
                        <li><Link href="/bookings" className="hover:text-white">My bookings</Link></li>
                        <li><Link href="/profile" className="hover:text-white">Profile</Link></li>
                        <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
                        <li><Link href="/terms" className="hover:text-white">Booking terms</Link></li>
                    </FooterCol>

                    <FooterCol title="Visit" className="col-span-2 lg:col-span-4">
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
                    <p>© {year} {settings.siteName}. All rights reserved.</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1">Pay with</span>
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
export function SocialIcon({ name, className = "h-[18px] w-[18px]" }) {
    if (name === "facebook")
        return (
            <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
                <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3Z" />
            </svg>
        );
    if (name === "instagram")
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
            </svg>
        );
    if (name === "youtube")
        return (
            <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
                <path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
            </svg>
        );
    return <span className="text-xs font-bold uppercase">{name?.[0]}</span>;
}