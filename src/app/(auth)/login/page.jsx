// src/app/(auth)/login/page.jsx
import { Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForms";
import { getHeroSlides, getSiteSettings } from "@/features/cms/queries";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
    const { t } = await getI18n();
    return { title: t("auth.loginMeta") };
}

export default async function LoginPage() {
    const [settings, slides, { t }] = await Promise.all([getSiteSettings(), getHeroSlides(), getI18n()]);
    // Side photo: a hero slide image if there is one, otherwise the plain pitch background.
    const withImage = slides.filter((s) => s.imageUrl);
    const imageUrl = withImage[0]?.imageUrl ?? withImage[0]?.imageUrl ?? null;

    return (
        <AuthLayout
            settings={settings}
            imageUrl={imageUrl}
            title={t("auth.loginTitle")}
            subtitle={t("auth.loginSub")}
            footer={
                <>
                    {t("auth.newHere")}{" "}
                    <Link href="/register" className="font-semibold text-ink hover:underline">
                        {t("auth.createLink")}
                    </Link>
                </>
            }
        >
            {/* Suspense is required because the form reads ?next= with useSearchParams */}
            <Suspense fallback={<div className="h-[320px]" />}>
                <LoginForm />
            </Suspense>
        </AuthLayout>
    );
}