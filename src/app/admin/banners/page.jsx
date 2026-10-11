// src/app/admin/banners/page.jsx
import BannersEditor from "@/features/cms/admin/BannersEditor";
import { promoBanners } from "@/lib/sample-data";
import { coupons } from "@/lib/admin-sample-data";

export const metadata = { title: "Offer banners" };

export default function Page() {
    return <BannersEditor banners={promoBanners} coupons={coupons} />;
}
