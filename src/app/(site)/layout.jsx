// src/app/(site)/layout.jsx
import TopBar from "@/components/site/TopBar";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import PromoPopup from "@/components/site/PromoPopup";
import { getSiteChrome } from "@/features/cms/queries";
import { getSession } from "@/lib/guards";

export default async function SiteLayout({ children }) {
    const [{ settings, nav, banners }, session] = await Promise.all([getSiteChrome(), getSession()]);

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