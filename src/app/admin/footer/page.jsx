// src/app/admin/footer/page.jsx
import FooterSeoForm from "@/features/cms/admin/FooterSeoForm";
import { siteSettings } from "@/lib/sample-data";

export const metadata = { title: "Footer & SEO" };

export default function Page() {
    return <FooterSeoForm settings={siteSettings} />;
}
