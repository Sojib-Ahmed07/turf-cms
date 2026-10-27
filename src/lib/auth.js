// src/lib/auth.js
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import * as schema from "@/db/schema/index.js";
import { sendOtpEmail, sendPasswordResetEmail } from "@/features/auth/emails";
import { BD_PHONE_HINT, cleanBdPhone } from "@/lib/phone";

const NAME_MAX = 60;

/**
 * Server-side check for the fields players can set through Better Auth itself
 * (sign-up and its built-in update-user route), so they can't skip the profile form's rules.
 * `fromRequest` = a player's request (show them the error); internal updates are only cleaned.
 */
function cleanUserFields(data, fromRequest) {
    const out = { ...data };
    if ("phone" in out && out.phone != null) {
        const phone = cleanBdPhone(out.phone);
        if (phone === null) {
            if (fromRequest) throw new APIError("BAD_REQUEST", { message: BD_PHONE_HINT });
            out.phone = null;
        } else {
            out.phone = phone || null;
        }
    }
    if (typeof out.name === "string") {
        // Trim and cap only (never reject: Google accounts can carry very short names)
        out.name = out.name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
    }
    return out;
}

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
        // Forgot password (/forgot-password, email code): signs the account out everywhere, so anyone
        // else who knew the old password (or registered the address first) loses access.
        revokeSessionsOnPasswordReset: true,
    },
    account: {
        accountLinking: {
            // Google sign-in only joins an existing email/password account once that account's email is
            // verified, so nobody can pre-register someone's address and take over their Google login.
            // (Better Auth's default; pinned here so an upgrade can't silently change it.)
            requireLocalEmailVerified: true,
        },
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
                // Registration code and forgot-password code send mail.
                if (type === "email-verification") {
                    await sendOtpEmail({ email, otp });
                    return;
                }
                if (type === "forget-password") {
                    await sendPasswordResetEmail({ email, otp });
                    return;
                }
                // Other types (sign-in by code, email change): not used here, no mail.
            },
        }),
    ],
    databaseHooks: {
        user: {
            create: {
                before: async (data, ctx) => ({ data: cleanUserFields(data, Boolean(ctx)) }),
            },
            update: {
                before: async (data, ctx) => ({ data: cleanUserFields(data, Boolean(ctx)) }),
            },
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
    },
    advanced: {
        database: { generateId: () => crypto.randomUUID() },
    },
});

export const isGoogleEnabled = googleEnabled;