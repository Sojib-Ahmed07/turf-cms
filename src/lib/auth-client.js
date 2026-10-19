// src/lib/auth-client.js
"use client";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: typeof window === "undefined" ? undefined : window.location.origin,
    plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;