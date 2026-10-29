// src/app/(site)/payment/failed/page.jsx
import PaymentResult from "@/features/payment/components/PaymentResult";
import { loadPaymentResult } from "@/features/payment/result-page";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
    const { t } = await getI18n();
    return { title: t("result.metaFailed") };
}
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {
    const result = await loadPaymentResult("failed", searchParams);
    return <PaymentResult {...result} />;
}