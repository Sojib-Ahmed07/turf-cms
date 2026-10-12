// src/app/(auth)/register/page.jsx
import { Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/AuthForms";
import { siteSettings, heroSlides } from "@/lib/sample-data";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
    return (
        <AuthLayout
            settings={siteSettings}
            imageUrl={heroSlides[1].imageUrl}
            title="Create your account"
            subtitle="Takes 30 seconds. Your first game gets ৳200 off."
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