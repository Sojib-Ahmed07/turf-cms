// src/app/admin/payments/page.jsx
import PaymentsTable from "@/features/admin/components/PaymentsTable";
import { payments } from "@/lib/admin-sample-data";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Payments" };

export default async function Page() {
    await requireRole(["admin"]);
    return <PaymentsTable payments={payments} />;
}