// src/app/(site)/page.jsx
import HeroSlider from "@/components/site/HeroSlider";
import QuickBook from "@/components/site/QuickBook";
import PromoBanner from "@/components/site/PromoBanner";
import LiveGrounds from "@/components/site/LiveGrounds";
import HowItWorks from "@/components/site/HowItWorks";
import VenueInfo from "@/components/site/VenueInfo";
import { getHeroSlides, getPromoBanners, getSections, getSiteSettings } from "@/features/cms/queries";
import { getGroundsToday, withVenueHours } from "@/features/booking/queries";

// Live availability: render on every request (CMS content itself is cached).
export const dynamic = "force-dynamic";

async function groundsTodaySafe() {
    try {
        return await getGroundsToday();
    } catch (err) {
        console.error("[home:groundsToday]", err?.message ?? err);
        return { date: null, pitches: [], freeCount: 0 };
    }
}

export default async function HomePage() {
    const [settings, slides, banners, sections, today] = await Promise.all([
        getSiteSettings().then(withVenueHours),
        getHeroSlides(),
        getPromoBanners(),
        getSections(),
        groundsTodaySafe(),
    ]);

    const liveNote =
        today.pitches.length === 0
            ? null
            : today.freeCount > 0
                ? `${today.freeCount} ${today.freeCount === 1 ? "slot" : "slots"} free today`
                : "Fully booked today";

    return (
        <>
            <HeroSlider
                slides={slides}
                autoplayMs={settings.slider.autoplayMs}
                pauseOnHover={settings.slider.pauseOnHover}
                liveNote={liveNote}
            />
            <QuickBook pitches={today.pitches} startDate={today.date} />
            {banners.home_after_hero && (
                <PromoBanner banner={banners.home_after_hero} variant="ticket" className="mt-16 sm:mt-24" />
            )}
            {sections.live_grounds.isVisible && (
                <LiveGrounds content={sections.live_grounds} pitches={today.pitches} date={today.date} />
            )}
            {sections.how_it_works.isVisible && <HowItWorks content={sections.how_it_works} />}
            {banners.home_mid && (
                <PromoBanner banner={banners.home_mid} variant="band" className="mt-20 sm:mt-28" />
            )}
            {sections.visit.isVisible && (
                <VenueInfo content={sections.visit} contact={settings.contact} siteName={settings.siteName} />
            )}
        </>
    );
}