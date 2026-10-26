// src/app/(site)/layout.jsx
import TopBar from "@/components/site/TopBar";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import PromoPopup from "@/components/site/PromoPopup";
import { getSiteChrome } from "@/features/cms/queries";
import { withVenueHours } from "@/features/booking/queries";
import { getSession } from "@/lib/guards";
import { getI18n } from "@/i18n/server";

export default async function SiteLayout({ children }) {
    const [{ settings: raw, nav, banners }, session, i18n] = await Promise.all([getSiteChrome(), getSession(), getI18n()]);
    const settings = await withVenueHours(raw, i18n);

    return (
        <>
            <TopBar banner={banners.top_bar} />
            {/* user is only a first-paint fallback; Navbar keeps it live with useSession() */}
            <Navbar settings={settings} items={nav} user={session?.user ?? null} />
            <main>{children}</main>
            <Footer settings={settings} items={nav} />
            <PromoPopup banner={banners.popup} />
        </>
    );
}