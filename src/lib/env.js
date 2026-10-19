// src/lib/env.js
// Checks the environment variables once when the server starts (called from src/instrumentation.js).
// Problems are printed as a clear list in the terminal / Vercel logs. In production a missing
// required value stops the server, so a broken deploy fails loudly instead of half working.
// Values are never printed, only the variable names.

const PLACEHOLDER = /^(replace|change|your|xxx|todo|example)|you@example\.com|USER:PASSWORD/i;

const isUrl = (v) => {
    try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
};

/** -> { errors: string[], warnings: string[] } for the given env (defaults to process.env). */
export function checkEnv(env = process.env) {
    // "live" = a production server on a real domain. `npm run start` on localhost is treated as local.
    const local = isUrl(env.APP_URL ?? "") && ["localhost", "127.0.0.1"].includes(new URL(env.APP_URL).hostname);
    const live = env.NODE_ENV === "production" && !local;
    const errors = [];
    const warnings = [];
    const has = (k) => typeof env[k] === "string" && env[k].trim() !== "";
    const placeholder = (k) => has(k) && PLACEHOLDER.test(env[k].trim());

    // Required everywhere
    if (!has("DATABASE_URL")) errors.push("DATABASE_URL is missing (Neon pooled connection string).");
    else if (placeholder("DATABASE_URL") || !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) errors.push("DATABASE_URL isn't a real Postgres connection string.");

    if (!has("BETTER_AUTH_SECRET")) errors.push("BETTER_AUTH_SECRET is missing.");
    else if (env.BETTER_AUTH_SECRET.length < 32) errors.push("BETTER_AUTH_SECRET must be at least 32 characters.");

    for (const k of ["APP_URL", "BETTER_AUTH_URL"]) {
        if (!has(k)) errors.push(`${k} is missing (the site's address, e.g. https://yourdomain.com).`);
        else if (!isUrl(env[k])) errors.push(`${k} isn't a full address (start it with https://).`);
    }
    if (has("APP_URL") && has("BETTER_AUTH_URL") && isUrl(env.APP_URL) && isUrl(env.BETTER_AUTH_URL)) {
        if (new URL(env.APP_URL).origin !== new URL(env.BETTER_AUTH_URL).origin) {
            warnings.push("APP_URL and BETTER_AUTH_URL point to different addresses; sign-in and payments expect the same one.");
        }
    }

    // Live site only
    if (live) {
        if (has("APP_URL") && isUrl(env.APP_URL) && new URL(env.APP_URL).protocol !== "https:") {
            errors.push("APP_URL must start with https:// on the live site.");
        }
        if (!has("CRON_SECRET") || placeholder("CRON_SECRET") || env.CRON_SECRET.length < 16) {
            errors.push("CRON_SECRET must be a random string of 16+ characters (the daily cleanup job is refused without it).");
        }
        for (const k of ["SSLCZ_API_BASE", "CLOUDINARY_API_BASE"]) {
            if (has(k)) errors.push(`${k} is for local tests only. Remove it from the live settings.`);
        }
        if (env.SSLCZ_IS_LIVE !== "true" && has("SSLCZ_STORE_ID")) {
            warnings.push("SSLCZ_IS_LIVE isn't \"true\", so payments go to the SSLCommerz sandbox (no real money).");
        }
    }

    // Optional features: warn so it's clear why something is switched off
    if (!has("SSLCZ_STORE_ID") || !has("SSLCZ_STORE_PASSWORD")) {
        warnings.push("SSLCZ_STORE_ID / SSLCZ_STORE_PASSWORD not set: Pay buttons are hidden and bookings can't be paid online.");
    }
    if (has("SSLCZ_IS_LIVE") && !["true", "false"].includes(env.SSLCZ_IS_LIVE)) {
        warnings.push('SSLCZ_IS_LIVE should be "true" or "false".');
    }
    const cldMissing = [
        !has("CLOUDINARY_CLOUD_NAME") && !has("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME") && "CLOUDINARY_CLOUD_NAME",
        !has("CLOUDINARY_API_KEY") && "CLOUDINARY_API_KEY",
        !has("CLOUDINARY_API_SECRET") && "CLOUDINARY_API_SECRET",
    ].filter(Boolean);
    if (cldMissing.length) {
        warnings.push(`${cldMissing.join(", ")} not set: image uploads in the admin are switched off.`);
    }
    if (has("GOOGLE_CLIENT_ID") !== has("GOOGLE_CLIENT_SECRET")) {
        warnings.push("Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither (Google sign-in stays off).");
    }
    if (placeholder("SEED_ADMIN_EMAIL")) {
        warnings.push("SEED_ADMIN_EMAIL is still the example address; npm run db:seed won't make anyone admin.");
    }
    if (!live && placeholder("CRON_SECRET")) {
        warnings.push("CRON_SECRET is still a placeholder. Set a random string before going live.");
    }

    // Brevo email OTP at registration. Without these, new players can't verify their email
    // and (because booking is blocked until verified) can't book either.
    const brevoMissing = ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME"].filter((k) => !has(k));
    if (brevoMissing.length) {
        warnings.push(`${brevoMissing.join(", ")} not set: registration codes can't be emailed, so new players can't verify and can't book.`);
    }

    return { errors, warnings };
}

/** Print the result; on a production server, stop if anything required is wrong. */
export function assertEnv(env = process.env) {
    const { errors, warnings } = checkEnv(env);
    if (warnings.length) console.warn(`[env] ${warnings.length} warning(s):\n  - ${warnings.join("\n  - ")}`);
    if (!errors.length) return;
    const msg = `[env] ${errors.length} problem(s) in the environment variables:\n  - ${errors.join("\n  - ")}`;
    if (env.NODE_ENV === "production") throw new Error(msg);
    console.error(msg);
}