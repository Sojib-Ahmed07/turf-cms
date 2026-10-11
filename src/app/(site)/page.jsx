// src/app/(site)/page.jsx
import HeroSlider from "@/components/site/HeroSlider";
import QuickBook from "@/components/site/QuickBook";
import PromoBanner from "@/components/site/PromoBanner";
import LiveGrounds from "@/components/site/LiveGrounds";
import HowItWorks from "@/components/site/HowItWorks";
import VenueInfo from "@/components/site/VenueInfo";
import { heroSlides, pitches, promoBanners, sections, siteSettings } from "@/lib/sample-data";

export default function HomePage() {
    return (
        <>
            <HeroSlider slides={heroSlides} autoplayMs={6000} liveNote="9 slots free tonight" />
            <QuickBook pitches={pitches} />
            <PromoBanner banner={promoBanners.home_after_hero} variant="ticket" className="mt-16 sm:mt-24" />
            <LiveGrounds content={sections.live_grounds} pitches={pitches} />
            <HowItWorks content={sections.how_it_works} />
            <PromoBanner banner={promoBanners.home_mid} variant="band" className="mt-20 sm:mt-28" />
            <VenueInfo content={sections.visit} contact={siteSettings.contact} />
        </>
    );
}
