# CLAUDE.md — TurfZone CMS

Turf-booking site + CMS for one venue in Dhaka (Next.js 16.4.3 App Router, React 19.3, Tailwind v4,
Drizzle + Neon Postgres, Better Auth + email OTP, Zod 4, SSLCommerz + direct bKash, Cloudinary, Brevo
email, `qrcode`, Leaflet). **JavaScript only, no TypeScript.** Last synced with the code: 26 Oct 2026
(Steps 0 to 8b done, security review done; direct Nagad dropped). Next.js **16.4.3** is a security patch: don't downgrade.

@Agents.md

`Agents.md` (imported above) is the source of truth for progress, conventions, booking rules, file map
and the step plan. This file adds the working rules for Claude. If the two disagree, `Agents.md` wins;
fix the drift (and if the code disagrees with both, the code wins). `ai-context.md` is the same handoff
for other models (Gemini, DeepSeek); keep its sections 3, 5, 6, 9 to 13 in sync at the end of a session.

## Do not read

`node_modules/`, `.next/`, `.git/`, `package-lock.json`, `drizzle/meta/*.json` (generated snapshots),
`public/` binaries. Never print or commit `.env.local` (holds `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`TICKET_SECRET`, Google, SSLCommerz, bKash, Cloudinary and Brevo keys).

Exception: before using a Next.js API you are unsure about, read the matching guide in
`node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`). Next 16 differs from older versions
(`proxy.js` instead of `middleware.js`, `revalidateTag(tag, "max")` takes two arguments, async `headers()`,
`next/dynamic` with `ssr: false` only inside a Client Component).

## Commands (PowerShell, Windows)

```
npm run dev           # next dev --webpack (Turbopack crashes here; keep --webpack)
npm run build         # next build; run this to check a change compiles
npm run lint          # eslint . (0 errors as of 26 Oct 2026; 2 accepted no-img-element warnings on QR images)
npm ci                # clean install; package.json and package-lock.json must change together
npm run start         # serve the production build
npm run db:generate   # after editing src/db/schema/*, then:
npm run db:migrate    # apply to Neon. Do not mix with db:push on the same database
npm run db:seed       # settings, nav, sections, hero, banners, coupons, 3 pitches, admin promotion
npm run db:studio
```

There are no tests. Verify with `npm run build` and by describing what to click in the browser.
Ask before running migrations or the seed against the database (it is a shared Neon instance).
`next build` downloads the Archivo font from Google Fonts, so it fails offline.

## Layout

```
src/
  app/
    (site)/            public pages: /, /book, /bookings, /profile, /terms, /payment/* (+ loading, error),
                       /verify/[token] (QR ticket check; public, admin sees "Mark as used")
    (auth)/            /login, /register, /verify-email (6-digit code)
    admin/             CMS + booking admin (layout guards with requireRole admin|editor; + loading, error)
    not-found.jsx, global-error.jsx, sitemap.js, robots.js
    api/auth/[...all]  Better Auth handler
    api/booked-slots   live slot board JSON (no-store)
    api/payment/sslcommerz/[event]  SSLCommerz callbacks: success | fail | cancel | ipn (POST)
    api/payment/bkash/callback      bKash browser callback (GET ?paymentID=&status=)
    api/cron/expire-holds           daily: re-check lost payments, expire holds (Bearer CRON_SECRET)
    api/ticket-qr/[token]           QR PNG for a signed ticket token (receipt emails)
  components/
    ui/                Button, Dialog, Field, Inputs, Switch, Badge
    site/              public site chrome and home sections (props only); VenueMap + VenueMapLoader (Leaflet),
                       VerifyTicket
    admin/             AdminShell, Kit, TonightBoard, StatusBadge, ImageUploader, MediaPicker, Toast
    auth/              AuthForms, AuthLayout, VerifyEmailForm
  features/
    auth/              emails.js (sendOtpEmail), ticket-email.js (receipt with QR)
    booking/           queries.js (getMyBookings adds qrDataUrl), actions.js, actions-email.js (resendTicketEmail),
                       slots.js (pure slot engine), calendar.js, parts.js, components/ (incl. TicketDialog)
    profile/           actions.js (updateProfile), components/ProfileClient.jsx
    admin/             queries.js, commerce-queries.js,
                       actions/{pitches,bookings,coupons,payments,users,checkin}.js, components/
    coupons/           rules.js (pure evaluateCoupon), service.js (checkCouponForSlot, redeemCoupon)
    cms/               queries.js (cached reads, settings.map), admin-queries.js, server-utils.js, actions/*,
                       upload-client.js, admin/ (8 live editors incl. TermsEditor; BrandingForm has Map location)
    payment/           service.js (start per gateway, confirm SSLCommerz / bKash, recheck per gateway, receipt email),
                       actions.js (payForBooking(id, method)), methods.js (GATEWAYS, getPayMethods),
                       result-page.js, components/ (PaymentResult, RetryPayButton, PayMethodPicker, PayDialog,
                       MethodOffDialog)
  db/                  index.js (neon-http), pool.js (unused), schema/, seed.js
  lib/                 auth (emailOTP), auth-client, guards, action, time, utils, cache-tags, sslcommerz,
                       bkash, cloudinary, brevo, ticket-token, qrcode, phone, env
  proxy.js             cookie check redirect for /admin, /bookings, /profile
  instrumentation.js   runs lib/env.js assertEnv() once at server start
drizzle/               migrations 0000 to 0004 (0002 check-in, 0003 map, 0004_next_fabian_cortez payments.gateway)
next.config.mjs        image hosts + security headers (X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS)
```

Import alias: `@/*` → `src/*`. Schema is re-exported from `@/db/schema`.

## Patterns to copy

**Server action** (see `src/features/booking/actions.js`, `src/features/admin/actions/bookings.js`):

```js
// src/features/<feature>/actions.js
"use server";

export async function doThing(input) {
    try {
        const user = await requireAdmin();            // or currentUser(); return DENIED / needsLogin
        if (!user) return DENIED;
        const parsed = schema.safeParse(input);       // zod; re-read prices/times/ids from the DB
        if (!parsed.success) return { ok: false, error: "Say what to fix." };
        // ... db work; map unique violations (23505) to a friendly error
        revalidatePath("/admin/...");                 // CMS data: revalidateTag(TAGS.x, "max")
        return { ok: true, data };
    } catch (err) {
        console.error(err);
        return { ok: false, error: "Something went wrong. Try again." };
    }
}
```

`src/lib/action.js` has an `action(schema, roles, handler)` wrapper, but don't use it as is: it calls
`requireRole`, whose `redirect()` throws inside its try/catch and turns into "Something went wrong".
Write the try/catch by hand like the existing actions, and never let an action throw to the client.

**Pages:** server component fetches, passes plain props to a client component. Add
`export const dynamic = "force-dynamic"` when it reads the session or live data. Wrap any client
component using `useSearchParams()` in `<Suspense>`.

**CMS reads:** `unstable_cache` + tag from `TAGS` in `src/lib/cache-tags.js`, with defaults if the
DB fails (see `src/features/cms/queries.js`). Writes in Step 5 must call `updateTag(TAGS.x)` (server
actions only, expires at once) for the same tag, plus `revalidatePath` for the admin page.

**Time:** only `src/lib/time.js` (Asia/Dhaka). A sheet's day starts at its first slot: pass `dayStart`
(`dayStartOf(blocks)`, `block.dayStart` from `resolveBlock`, `getSheetDayStarts` for bookings) to `isBlockPast` and friends.
"Today" = `currentVenueDay()`. Never hard-code 6 am.
Never `new Date().getHours()` or `toLocaleDateString` on the server.

**Images the admin can set:** `<Image unoptimized={!canOptimize(src)} />`. Allowed remote hosts in
`next.config.mjs`: `images.unsplash.com`, `res.cloudinary.com`.

**Money:** BDT, integers, format with `taka()`; 12-hour times with `time12()` (`src/lib/utils.js`).

**Emails:** build in `src/features/auth/*` on top of `sendBrevoEmail` (`src/lib/brevo.js`); escape every
interpolated value. Send after a response with `waitUntil(promise.catch(...))` from `@vercel/functions`;
an email failure must never fail a booking or payment.

**QR tickets:** never put a raw booking id in a URL. Use `ticketVerifyUrl(bookingId)` /
`signTicket` / `verifyTicketToken` (`src/lib/ticket-token.js`) and `qrDataUrlForUrl` (`src/lib/qrcode.js`).
The token only proves we issued it; always re-read the booking. Email clients need a real URL
(`/api/ticket-qr/<token>`), not a data URL.

**Browser-only libraries** (Leaflet): import through a `"use client"` wrapper using
`next/dynamic(..., { ssr: false })`, like `VenueMapLoader.jsx`.

**Payments:** every gateway goes through `features/payment/methods.js` (add it to `GATEWAYS`,
`isGatewayConfigured`, labels) and `service.js` (start branch, confirm that only trusts the gateway's own
server-side answer, recheck branch), then reuses `claimAndSettle`. Never confirm from callback URL fields.
UI takes `payMethods` from `await getPayMethods()`; never hard-code a gateway in a component.
"Configured" (env keys, `isGatewayConfigured`) and "enabled" (admin switch, `page_sections` key `payments`)
are different: only *starting* a payment checks the switch; callbacks, rechecks and cron must not.

**Redirect targets:** any `next`/return path from the URL goes through `safeNext()` (`src/lib/utils.js`): only
same-site paths. **Phones:** use `src/lib/phone.js` (`normalizeBdPhone`, `cleanBdPhone`, `BD_PHONE_RE`). Better Auth
`databaseHooks` in `lib/auth.js` validate phone/name on sign-up and update-user; keep them when adding user fields.
**Booking dates:** server-side window `BOOKING_DAYS_AHEAD` + `isRealDate` (`booking/calendar.js`).

**Booking gate:** `createBookingHold` and `payForBooking` refuse unverified emails with
`{ ok: false, needsVerify: true }`. Keep that check in any new booking or payment entry point.

## Roles

`user.role`: `user` (player), `editor` (CMS content only), `admin` (everything). Editor is still live in
the code (an older `ai-context.md` wrongly said 7a removed it). Branding, navigation, grounds, bookings,
payments, coupons, users and ticket check-in are admin only (`adminOnly` in `AdminShell`, `ADMIN_ONLY` in
actions). Check the role inside every admin action, not only in the layout. Admin-only pages also call
`requireRole(["admin"])` themselves. `/verify/[token]` is public; only `markTicketUsed` needs admin.

## Known gaps (as of 26 Oct 2026)

- `BLUEPRINT.md` is not in the repo. `ai-context.md` section 12 has the remaining plan; ask before
  assuming anything beyond it.
- 27 Oct audit fixes: run `npm run db:migrate` for **0006** (coupon redemption index; coupons break without it), and set
  the external cron to every 10 minutes (DEPLOY.md section 9). Roles now include `staff` (gate check-in only).
- Steps 0 to 8b are done (7a email OTP, 7b QR tickets + check-in + receipt email, 7c venue map,
  8a direct bKash, 8b admin payment-method switches). Migrations 0002 to 0004 must be applied on every database.
- Direct Nagad was dropped (needs a whitelisted fixed IP; Vercel Static IPs cost $100/month). Don't build it
  unless asked; Nagad works through SSLCommerz.
- To confirm on the dev machine: the `payments.gateway` column exists (migrate printed no success line), and a real
  sandbox payment with bKash and SSLCommerz.
- Next: pre-deploy fixes, then `DEPLOY.md`.
- bKash refunds are manual (merchant panel), like SSLCommerz.
- `DEPLOY.md` is behind: its env table and checks lack `BREVO_*`, `TICKET_SECRET` and `BKASH_*`.
- Admin, Bookings has no "Checked in" column/filter (`getAdminBookings` doesn't read `checkedInAt`).
- `/verify` shows 24-hour times and hard-codes "TurfZone" in `VerifyTicket` copy.
- Open question for the client: keep `/verify/<token>` public, or staff-only?
- Not built (ask first): audit log writes for admin actions (only receipt resends are logged), SMS, SSLCommerz refund API.
- Declined (26 Oct): a hidden page to override the revenue shown on /admin. Don't build editable or fake financial
  figures that viewers can't tell apart from real ones.
- `npm audit`: 4 moderate in drizzle-kit's esbuild (dev only); everything else clean.
- Default booking terms are a draft (24 h notice, 10 working days refunds); the venue must confirm them.

## End of session

Update `Agents.md` sections 2 (Where things stand), 8 (Step plan) and 10 (Changelog), plus any file
tables in section 6 that changed; `ai-context.md` sections 3, 5, 6, 9 to 13; and this file's Layout and
Known gaps.
Commit only when asked.