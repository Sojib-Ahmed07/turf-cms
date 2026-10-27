// src/app/(auth)/forgot-password/page.jsx
import { Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getHeroSlides, getSiteSettings } from "@/features/cms/queries";

export const metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage({ searchParams }) {
    const [settings, slides] = await Promise.all([getSiteSettings(), getHeroSlides()]);
    const imageUrl = slides.find((s) => s.imageUrl)?.imageUrl ?? null;
    const sp = await searchParams;

    return (
        <AuthLayout
            settings={settings}
            imageUrl={imageUrl}
            title="Reset your password"
            subtitle="We'll email you a 6-digit code. Enter it with a new password to get back in."
            footer={
                <>
                    Remembered it?{" "}
                    <Link href="/login" className="font-semibold text-ink hover:underline">
                        Sign in
                    </Link>
                </>
            }
        >
            {/* Suspense: the form reads ?next= with useSearchParams */}
            <Suspense fallback={<div className="h-[320px]" />}>
                <ForgotPasswordForm initialEmail={typeof sp?.email === "string" ? sp.email.slice(0, 200) : ""} />
            </Suspense>
        </AuthLayout>
    );
}