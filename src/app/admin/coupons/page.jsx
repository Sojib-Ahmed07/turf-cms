// src/app/admin/coupons/page.jsx
import CouponsManager from "@/features/admin/components/CouponsManager";
import { coupons } from "@/lib/admin-sample-data";

export const metadata = { title: "Coupons" };

export default function Page() {
    return <CouponsManager coupons={coupons} />;
}
