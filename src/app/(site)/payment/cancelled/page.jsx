// src/app/(site)/payment/cancelled/page.jsx
import PaymentResult from "@/features/payment/components/PaymentResult";
import { loadPaymentResult } from "@/features/payment/result-page";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
    const { t } = await getI18n();
    return { title: t("result.metaCancelled") };
}
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {
    const result = await loadPaymentResult("cancelled", searchParams);
    return <PaymentResult {...result} />;
}