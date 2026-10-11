// src/app/admin/payments/page.jsx
import PaymentsTable from "@/features/admin/components/PaymentsTable";
import { payments } from "@/lib/admin-sample-data";

export const metadata = { title: "Payments" };

export default function Page() {
    return <PaymentsTable payments={payments} />;
}
