// src/app/(auth)/verify-email/page.jsx
import { Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { getHeroSlides, getSiteSettings } from "@/features/cms/queries";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
    const { t } = await getI18n();
    return { title: t("auth.verifyTitle") };
}

export default async function VerifyEmailPage({ searchParams }) {
    const [settings, slides, { t }] = await Promise.all([getSiteSettings(), getHeroSlides(), getI18n()]);
    const withImage = slides.filter((s) => s.imageUrl);
    const imageUrl = withImage[0]?.imageUrl ?? null;
    const sp = await searchParams;

    return (
        <AuthLayout
            settings={settings}
            imageUrl={imageUrl}
            title={t("auth.verifyTitle")}
            subtitle={t("auth.verifySub")}
            footer={
                <>
                    {t("auth.wrongEmail")}{" "}
                    <Link href="/register" className="font-semibold text-ink hover:underline">
                        {t("auth.startAgain")}
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