// src/app/(auth)/login/page.jsx
import { Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForms";
import { siteSettings, heroSlides } from "@/lib/sample-data";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
    return (
        <AuthLayout
            settings={siteSettings}
            imageUrl={heroSlides[0].imageUrl}
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