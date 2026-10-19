// src/lib/auth.js
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema/index.js";
import { sendOtpEmail } from "@/features/auth/emails";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
    appName: "TurfZone",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 8,
        // Unverified users can sign in (so they can reach /verify-email),
        // but booking actions are blocked until emailVerified is true.
        requireEmailVerification: false,
    },
    socialProviders: googleEnabled
        ? {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
        }
        : {},
    user: {
        additionalFields: {
            phone: { type: "string", required: false, input: true },
            role: { type: "string", required: false, input: false, defaultValue: "user" },
        },
    },
    plugins: [
        emailOTP({
            otpLength: 6,
            expiresIn: 300, // 5 minutes
            allowedAttempts: 3,
            sendVerificationOTP: async ({ email, otp, type }) => {
                // Only the email-verification flow sends mail here.
                // sign-in / forget-password OTPs are not used in this project.
                if (type === "email-verification") {
                    await sendOtpEmail({ email, otp });
                    return;
                }
                // Other types: no-op (they are never triggered from the UI).
            },
        }),
    ],
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
    },
    advanced: {
        database: { generateId: () => crypto.randomUUID() },
    },
});

export const isGoogleEnabled = googleEnabled;