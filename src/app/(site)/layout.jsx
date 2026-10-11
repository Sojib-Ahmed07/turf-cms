// src/app/(site)/layout.jsx
import TopBar from "@/components/site/TopBar";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import PromoPopup from "@/components/site/PromoPopup";
import { siteSettings, navItems, promoBanners } from "@/lib/sample-data";

export default function SiteLayout({ children }) {
    return (
        <>
            <TopBar banner={promoBanners.top_bar} />
            <Navbar settings={siteSettings} items={navItems} user={null} />
            <main>{children}</main>
            <Footer settings={siteSettings} items={navItems} />
            <PromoPopup banner={promoBanners.popup} />
        </>
    );
}
