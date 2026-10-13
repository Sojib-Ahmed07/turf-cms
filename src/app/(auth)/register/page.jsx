// src/app/(auth)/register/page.jsx
import { Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/AuthForms";
import { getHeroSlides, getSiteSettings } from "@/features/cms/queries";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
    const [settings, slides] = await Promise.all([getSiteSettings(), getHeroSlides()]);
    // Side photo: a hero slide image if there is one, otherwise the plain pitch background.
    const withImage = slides.filter((s) => s.imageUrl);
    const imageUrl = withImage[1]?.imageUrl ?? withImage[0]?.imageUrl ?? null;

    return (
        <AuthLayout
            settings={settings}
            imageUrl={imageUrl}
            title="Create your account"
            subtitle="Takes 30 seconds. All your bookings and tickets in one place."
            footer={
                <>
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-ink hover:underline">
                        Sign in
                    </Link>
                </>
            }
        >
            {/* Suspense is required because the form reads ?next= with useSearchParams */}
            <Suspense fallback={<div className="h-[320px]" />}>
                <RegisterForm />
            </Suspense>
        </AuthLayout>
    );
}