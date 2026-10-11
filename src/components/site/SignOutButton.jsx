// src/components/site/SignOutButton.jsx
"use client";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export default function SignOutButton({ className }) {
    const router = useRouter();
    return (
        <button
            type="button"
            className={className}
            onClick={async () => {
                await signOut();
                router.push("/");
                router.refresh();
            }}
        >
            Sign out
        </button>
    );
}