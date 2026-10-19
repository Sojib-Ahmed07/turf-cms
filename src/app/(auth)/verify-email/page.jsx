// src/app/(auth)/verify-email/page.jsx
import { Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { getHeroSlides, getSiteSettings } from "@/features/cms/queries";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }) {
    const [settings, slides] = await Promise.all([getSiteSettings(), getHeroSlides()]);
    const withImage = slides.filter((s) => s.imageUrl);
    const imageUrl = withImage[0]?.imageUrl ?? null;
    const sp = await searchParams;

    return (
        <AuthLayout
            settings={settings}
            imageUrl={imageUrl}
            title="Check your email"
            subtitle="We sent a 6-digit code to your inbox. Enter it below to finish creating your account."
            footer={
                <>
                    Wrong email?{" "}
                    <Link href="/register" className="font-semibold text-ink hover:underline">
                        Start again
                    </Link>
                </>
            }
        >
            <Suspense fallback={<div className="h-[320px]" />}>
                <VerifyEmailForm initialEmail={typeof sp?.email === "string" ? sp.email : ""} />
            </Suspense>
        </AuthLayout>
    );
}