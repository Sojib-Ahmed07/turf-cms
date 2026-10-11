// src/app/admin/branding/page.jsx
import BrandingForm from "@/features/cms/admin/BrandingForm";
import { siteSettings } from "@/lib/sample-data";

export const metadata = { title: "Branding" };

export default function Page() {
    return <BrandingForm settings={siteSettings} />;
}
