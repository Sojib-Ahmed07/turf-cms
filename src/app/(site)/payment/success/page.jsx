// src/app/(site)/payment/success/page.jsx
import PaymentResult from "@/features/payment/components/PaymentResult";
import { loadPaymentResult } from "@/features/payment/result-page";

export const metadata = { title: "Payment received" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {
    const result = await loadPaymentResult("success", searchParams);
    return <PaymentResult {...result} />;
}