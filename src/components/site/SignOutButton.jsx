// src/components/site/SignOutButton.jsx
"use client";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { useI18n } from "@/i18n/I18nProvider";
import { startNavProgress } from "@/lib/nav-progress";

export default function SignOutButton({ className }) {
    const router = useRouter();
    const { t } = useI18n();
    return (
        <button
            type="button"
            className={className}
            onClick={async () => {
                await signOut();
                startNavProgress();
                router.push("/");
                router.refresh();
            }}
        >
            {t("common.signOut")}
        </button>
    );
}