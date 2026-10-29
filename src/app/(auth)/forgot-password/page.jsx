// src/app/(auth)/forgot-password/page.jsx
import { Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getHeroSlides, getSiteSettings } from "@/features/cms/queries";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
    const { t } = await getI18n();
    return { title: t("auth.forgotTitle"), robots: { index: false, follow: false } };
}

export default async function ForgotPasswordPage({ searchParams }) {
    const [settings, slides, { t }] = await Promise.all([getSiteSettings(), getHeroSlides(), getI18n()]);
    const imageUrl = slides.find((s) => s.imageUrl)?.imageUrl ?? null;
    const sp = await searchParams;

    return (
        <AuthLayout
            settings={settings}
            imageUrl={imageUrl}
            title={t("auth.forgotTitle")}
            subtitle={t("auth.forgotSub")}
            footer={
                <>
                    {t("auth.remembered")}{" "}
                    <Link href="/login" className="font-semibold text-ink hover:underline">
                        {t("auth.signIn")}
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