// src/app/(site)/payment/success/page.jsx
import PaymentResult from "@/features/payment/components/PaymentResult";

const sample = {
    id: "TZ-8F2K1",
    pitch: "Pitch B",
    date: "2026-10-17",
    start: "21:00",
    end: "22:30",
    total: 2400,
    paidWith: "bKash",
    trxId: "BKA81XQ2ZP",
    holdMinutesLeft: 12,
};

export default function Page() {
    return <PaymentResult status="success" booking={sample} />;
}
