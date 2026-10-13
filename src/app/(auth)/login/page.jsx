// src/app/(auth)/login/page.jsx
import { Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForms";
import { getHeroSlides, getSiteSettings } from "@/features/cms/queries";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
    const [settings, slides] = await Promise.all([getSiteSettings(), getHeroSlides()]);
    // Side photo: a hero slide image if there is one, otherwise the plain pitch background.
    const withImage = slides.filter((s) => s.imageUrl);
    const imageUrl = withImage[0]?.imageUrl ?? withImage[0]?.imageUrl ?? null;

    return (
        <AuthLayout
            settings={settings}
            imageUrl={imageUrl}
            title="Welcome back"
            subtitle="Sign in to book slots and see your tickets."
            footer={
                <>
                    New here?{" "}
                    <Link href="/register" className="font-semibold text-ink hover:underline">
                        Create an account
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