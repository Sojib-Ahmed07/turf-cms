// src/components/site/VenueInfo.jsx
import { Check, Clock3, MapPin, Navigation, Phone } from "lucide-react";
import Button from "@/components/ui/Button";
import VenueMapLoader from "./VenueMapLoader";
import { getI18n } from "@/i18n/server";

/**
 * "Find us" section. Shows the admin-set Leaflet map when latitude/longitude are saved
 * in Admin -> Branding; otherwise a styled illustration.
 * VenueMapLoader is a client component that lazy-loads Leaflet (ssr: false lives there).
 */
export default async function VenueInfo({ content, contact, siteName = "TurfZone", map = null }) {
    const { t } = await getI18n();
    const phoneHref = contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, "")}` : null;

    return (
        <section id="visit" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-5">
                    <h2 className="display text-[clamp(36px,4.8vw,60px)] text-ink">{content.heading}</h2>
                    {content.body && (
                        <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-ink-3">{content.body}</p>
                    )}

                    <dl className="mt-10 divide-y divide-line border-y border-line">
                        {contact.address && <Row icon={MapPin} label={t("visit.address")} value={contact.address} />}
                        {contact.hours && <Row icon={Clock3} label={t("visit.hours")} value={contact.hours} />}
                        {contact.phone && <Row icon={Phone} label={t("visit.phone")} value={contact.phone} />}
                    </dl>

                    <div className="mt-8 flex flex-wrap gap-3">
                        {contact.mapUrl && (
                            <Button href={contact.mapUrl} variant="ink" size="lg" target="_blank" rel="noreferrer">
                                <Navigation className="h-4 w-4" />
                                {t("visit.directions")}
                            </Button>
                        )}
                        {phoneHref && (
                            <Button href={phoneHref} variant="outline" size="lg">
                                {t("visit.callDesk")}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-4 lg:col-span-7">
                    {map ? <VenueMapLoader map={map} name={siteName} /> : <MapArt name={siteName} />}
                    {content.facilities.length > 0 && (
                        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-card bg-white p-6 ring-1 ring-line sm:grid-cols-3">
                            {content.facilities.map((f) => (
                                <li key={f} className="flex items-center gap-2.5 text-[14px] font-medium text-ink-2">
                                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-soft text-brand-deep">
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                    </span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}

function Row({ icon: Icon, label, value }) {
    return (
        <div className="flex gap-4 py-4">
            <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink-4" />
            <div>
                <dt className="text-xs font-medium text-ink-3">{label}</dt>
                <dd className="mt-0.5 text-[15px] font-semibold text-ink">{value}</dd>
            </div>
        </div>
    );
}

function MapArt({ name }) {
    return (
        <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-[#e9eee6] ring-1 ring-line">
            <svg viewBox="0 0 800 500" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                {/* blocks */}
                <g fill="#dde5d9">
                    <rect x="40" y="40" width="180" height="120" rx="10" />
                    <rect x="260" y="40" width="220" height="120" rx="10" />
                    <rect x="40" y="200" width="180" height="140" rx="10" />
                    <rect x="520" y="40" width="240" height="160" rx="10" />
                    <rect x="520" y="240" width="240" height="220" rx="10" />
                    <rect x="40" y="380" width="440" height="100" rx="10" />
                </g>
                {/* park */}
                <rect x="260" y="200" width="220" height="140" rx="10" fill="#cfe3cf" />
                {/* roads */}
                <g stroke="#ffffff" strokeLinecap="round">
                    <path d="M0 180H800" strokeWidth="22" />
                    <path d="M240 0V500" strokeWidth="16" />
                    <path d="M500 0V500" strokeWidth="22" />
                    <path d="M0 360H500" strokeWidth="14" />
                </g>
                {/* metro line */}
                <path d="M-20 470C200 430 360 300 500 250S760 120 820 90" stroke="var(--color-pitch)" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" fill="none" opacity="0.45" />
                <text x="58" y="172" fontSize="13" fontWeight="600" fill="#7d8b84">রোড ৭</text>
                <text x="512" y="320" fontSize="13" fontWeight="600" fill="#7d8b84" transform="rotate(90 512 320)">মিরপুর রোড</text>
            </svg>

            {/* pin */}
            <div className="absolute left-[46%] top-[53%] -translate-x-1/2 -translate-y-full">
                <div className="flex items-center gap-2 rounded-full bg-pitch py-1.5 pl-1.5 pr-4 text-[13px] font-bold text-white shadow-[0_12px_30px_-10px_rgb(11_59_44/0.7)]">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand">
                        <MapPin className="h-3.5 w-3.5" />
                    </span>
                    {name}
                </div>
                <span className="mx-auto block h-3 w-[2px] bg-pitch" />
                <span className="mx-auto block h-2.5 w-2.5 rounded-full border-2 border-white bg-pitch" />
            </div>
        </div>
    );
}