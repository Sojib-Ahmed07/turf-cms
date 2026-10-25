# AI_CONTEXT.md: TurfZone CMS handoff

Paste this whole file into a new chat (Claude, Gemini, DeepSeek, any model) before asking for work,
then attach the source files the task touches. It is self-contained: everything a new model needs to
continue the project without the old chat. Last updated **25 Oct 2026**, after Step 7a (email OTP at
registration), Step 7b (QR tickets, `/verify/<token>`, check-in, receipt email) and Step 7c (admin-set
Leaflet venue map). All build steps are done; next is deploy.

In the repo, `Agents.md` holds the same facts in more detail (file tables, changelog) and `CLAUDE.md`
holds Claude Code's working rules. If this file and the code disagree, the code wins; fix this file.

---

## 1. The project in one paragraph

TurfZone CMS is a turf-booking website for **one venue** in Mirpur 12, Dhaka, Bangladesh (sample name
"TurfZone", three grounds, open 6 am to 3 am, prices in BDT ৳). Built for a client. Players register
(email code via Brevo), pick a ground, a date and a time block, pay online through **SSLCommerz**
(bKash, Nagad, Rocket, cards) and get a ticket with a **signed QR code** (on screen and by email).
Staff scan the QR at the gate and mark it used. The **design is fixed in code**; the admin edits content
only: logo, brand colour, map location, hero slider, offer banners, menu labels, home sections, footer,
SEO, booking terms, grounds and slot schedules. The UI was designed new; the booking logic was ported
from an earlier prototype (`turf.zip`, bKash replaced by SSLCommerz).

## 2. How the developer works (follow this or the answer can't be used)

- **JavaScript only. No TypeScript**, no `.ts/.tsx`, no type annotations.
- Windows + PowerShell, project at `D:\projects\turf-cms`, env file is **`.env.local`**.
- Deliver **complete files**, never diffs or "rest unchanged" snippets. **Line 1 of every file is its
  path as a comment**: `// src/features/booking/queries.js` (JSON files can't hold comments; say the path).
- **No zip files.** Send files one by one and say for each: new or replace, and the exact folder.
  Use Windows paths in instructions (`src\app\api\...`). Spell out bracket folders exactly
  (`[event]`, `[id]`, `[token]`, `[...all]`), they have been misplaced before.
- Work in **steps** (one feature area at a time) and end each step with: files list, npm installs (if
  any), migrations (if any), and what to click to test.
- Plain, direct English. Explain env and deploy steps clearly.
- **Route files must live under `src/app/`.** Anything under `src/features/` is not a URL.
- Never say to paste `.env.example` over `.env.local` (it wipes the real secrets). New env vars:
  give the exact lines to add.

## 3. Status

| Step | What | State |
|---|---|---|
| 0 | Full UI with sample data, schema, first migration, Better Auth, guards, proxy, seed | Done |
| 1 | Booking, player side: live slots, 15-min holds, My bookings | Done 12 Oct |
| 3 | Booking, admin side: overview, grounds + slot editor, bookings table, walk-ins, cancel/refund | Done 13 Oct |
| 4 | CMS read side: whole public site reads settings/nav/hero/banners/sections from the DB | Done 13 Oct |
| 2 | SSLCommerz payments: pay, callbacks, IPN, result pages, retry, lost-payment recheck, cron | Done 13 Oct (38 integration tests + browser e2e against a mock gateway) |
| 5 | CMS write side: Cloudinary uploads, media library, all content editors | Done 14 Oct (58 integration tests + browser e2e) |
| 6a | Coupons at checkout (incl. free bookings), Coupons, Payments and Users admin pages | Done 15 Oct (52 integration tests + browser e2e) |
| 6b | Profile, terms (+ editor), Show ticket, loading/error/404, sitemap/robots, env check, lint clean, `DEPLOY.md` | Done 15 Oct |
| 7a | Brevo email OTP at registration (Better Auth `emailOTP`); unverified players can't hold or pay; admin sees player name + phone | Done 19 Oct |
| 7b | Signed QR on every confirmed ticket, public `/verify/<token>` page, admin "Mark as used" check-in, booking receipt email with QR (auto + "Email receipt" button) | Done 19 Oct |
| 7c | Venue map: admin sets lat/lng/zoom/label/address in Branding; home "Find us" shows a Leaflet/OpenStreetMap map (illustration when empty) | Done 22 Oct (migration 0003) |
| **Deploy** | **Vercel + live Neon branch + domain + live SSLCommerz, following `DEPLOY.md`** | **Next** |

Code check on 25 Oct: `npm run lint` = 0 errors, 2 warnings (`@next/next/no-img-element` on the QR `<img>`
in `BookingTicket.jsx` and `TicketDialog.jsx`; intentional, data URLs). `npm run build` must be re-run
on the developer's machine after 7b/7c (it needs Google Fonts reachable).

Open items on the developer's side:
- Migrations **0002** (check-in columns) and **0003** (map columns) must be applied: `npm run db:migrate`
  (local DB now, live DB during deploy).
- `.env.local`: `SEED_ADMIN_EMAIL` and `CRON_SECRET` were placeholders. To get an admin: set the real
  email, register on the site, run `npm run db:seed` again.
- SSLCommerz sandbox: store ID/password go in `.env.local`; Pay buttons stay hidden until both are set.
- Cloudinary keys were empty in `.env.local` (as of 15 Oct), so admin uploads are off until they're added.
- **Brevo**: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` are required for registration
  codes **and** booking receipts. The sender must be verified in Brevo.
- **`TICKET_SECRET`**: set 32+ random characters (falls back to `BETTER_AUTH_SECRET` with a warning).
- The default booking terms are a draft; the venue must check them in Admin, Booking terms.
- The seeded FIRST200 popup (Offer banners) is still switched off; turn it on now that coupons work.
- Set the map coordinates in Admin, Branding, Map location.
- **`DEPLOY.md` is behind the code**: its Vercel env table lacks `BREVO_*` and `TICKET_SECRET`, and its
  final checks don't cover OTP, QR scan or receipt email. Update it before deploying.

## 4. Stack and commands

Next.js **16.4** (App Router, webpack dev), React **19.3**, Tailwind **v4**, Drizzle ORM 0.45 +
drizzle-kit 0.31, **Neon Postgres** (`@neondatabase/serverless`, neon-http driver), **Better Auth** 1.7
(email/password + Google, `role` and `phone` extra fields, `emailOTP` plugin), Zod 4, framer-motion,
lucide-react, embla-carousel (hero), clsx + tailwind-merge, **`qrcode`** 1.5 (server-side QR PNGs),
**`leaflet`** 1.9 + **`react-leaflet`** 5 (venue map, OpenStreetMap tiles, no API key),
**`@vercel/functions`** (`waitUntil` for background receipt emails). Cloudinary is used without its SDK
(signed REST calls, `src/lib/cloudinary.js`). Brevo transactional email via REST (`src/lib/brevo.js`).
Hosting: Vercel (planned).

```
npm run dev           # next dev --webpack (Turbopack crashes on this machine; keep --webpack)
npm run build         # must pass before delivering
npm run lint          # 0 errors; keep it that way (2 known img warnings for QR codes)
npm run db:generate   # after editing src/db/schema/*, then
npm run db:migrate    # apply to Neon (never mix with db:push on the same DB)
npm run db:seed       # idempotent: settings, nav, sections, hero, banners, coupons, 3 pitches, admin promotion
npm run db:studio
```

**Next 16 differences that bite:** `src/proxy.js` replaces `middleware.js`; `params`, `searchParams`,
`headers()`, `cookies()` are async (await them); `revalidateTag(tag, "max")` needs two arguments;
`updateTag(tag)` exists for server actions (immediate expiry, use it after admin saves);
`next/dynamic` with `ssr: false` is only allowed inside a Client Component (see `VenueMapLoader.jsx`).
When unsure, read `node_modules/next/dist/docs/` before writing code.

## 5. Environment variables (`.env.local`, names only)

| Name | Used for |
|---|---|
| `APP_URL` | Public site URL. SSLCommerz callbacks, QR verify URLs, email links, metadata base |
| `DATABASE_URL` | Neon pooled connection string |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Auth (URL = site URL) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google sign-in |
| `SEED_ADMIN_EMAIL` | Seed promotes this registered user to admin |
| `CRON_SECRET` | Bearer token for `/api/cron/expire-holds` (Vercel Cron sends it automatically) |
| `SSLCZ_STORE_ID`, `SSLCZ_STORE_PASSWORD`, `SSLCZ_IS_LIVE` | Payments (`false` = sandbox) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Uploads. Optional `CLOUDINARY_FOLDER` (default `turfzone`). Old `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` still works |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Registration OTP + booking receipt emails. Sender must be verified in Brevo |
| `TICKET_SECRET` | HMAC key for QR ticket tokens, 32+ chars. Falls back to `BETTER_AUTH_SECRET` (env check warns). Changing it invalidates every QR issued before |
| `APP_NAME` | Optional. Site name used in the OTP email only (default "TurfZone"); receipts use the CMS site name |

`SSLCZ_API_BASE` and `CLOUDINARY_API_BASE` exist only to point tests at mocks; never set them in real env
files (the live server refuses to start). Never print, log or commit `.env.local`.

## 6. Project map

```
src/
  proxy.js                 cookie check -> /login for /admin, /bookings, /profile
  instrumentation.js       runs lib/env.js assertEnv() once at server start
  app/
    layout.jsx             root: font, brand colour + SEO from site settings, force-dynamic
    (site)/                public: layout (top bar, navbar, footer, popup), /, /book, /bookings,
                           /profile, /terms, /payment/success|failed|cancelled,
                           /verify/[token] (QR ticket check, public; admin sees "Mark as used");
                           loading.jsx, error.jsx
    (auth)/                /login, /register, /verify-email
    admin/                 layout (requireRole admin|editor); page (overview); pitches/, pitches/[id]/;
                           bookings, branding, navigation, hero, banners, sections, footer, media,
                           terms, coupons, payments, users
    not-found.jsx, global-error.jsx, sitemap.js, robots.js
    api/auth/[...all]/route.js               Better Auth
    api/booked-slots/route.js                slot board JSON for /book and walk-ins
    api/payment/sslcommerz/[event]/route.js  POST success | fail | cancel | ipn
    api/cron/expire-holds/route.js           housekeeping (vercel.json: 21:00 UTC = 3 am Dhaka)
    api/ticket-qr/[token]/route.js           GET: QR PNG for a signed token (used by the receipt email)
  components/
    ui/                    Button, Badge, Dialog, Field/Input, Inputs, Switch
    site/                  Navbar, TopBar, Footer, FooterCta, Logo, HeroSlider, QuickBook, PromoBanner,
                           PromoPopup, LiveGrounds, HowItWorks, VenueInfo, PitchLines, SignOutButton,
                           VenueMap (Leaflet, client), VenueMapLoader (ssr:false wrapper),
                           VerifyTicket (result card + "Mark as used")
    admin/                 AdminShell, Kit (PageHeader, Panel, SettingRow, Label, SaveBar, OrderButtons,
                           Table/Th/Td, Toolbar), ImageUploader, MediaPicker, Toast (useToast),
                           StatusBadge, TonightBoard
    auth/                  AuthForms, AuthLayout, VerifyEmailForm
    ErrorPanel.jsx
  features/
    auth/                  emails.js (sendOtpEmail), ticket-email.js (sendTicketEmail,
                           sendBookingReceiptByBookingId)
    booking/               queries.js (getMyBookings adds ticketToken + qrDataUrl), actions.js
                           (emailVerified gate, receipt on free booking), actions-email.js
                           (resendTicketEmail), slots.js, calendar.js, parts.js, components/
    profile/               actions.js (updateProfile), components/ProfileClient.jsx
    admin/                 queries.js, commerce-queries.js,
                           actions/{pitches,bookings,coupons,payments,users,checkin}.js, components/
    coupons/               rules.js, service.js
    cms/                   queries.js, admin-queries.js, server-utils.js, actions/*, upload-client.js,
                           admin/ (8 editors; BrandingForm has Map location)
    payment/               service.js (receipt after confirm), actions.js (emailVerified gate),
                           result-page.js, components/
  db/                      index.js, pool.js (unused), schema/{auth,booking,commerce,cms}.js, seed.js
  lib/                     auth (emailOTP), auth-client (emailOTPClient), guards, action, time, utils,
                           cache-tags, sslcommerz, cloudinary, brevo, ticket-token, qrcode, env
drizzle/                   0000 initial schema, 0001 booking FKs + unique active-slot index,
                           0002 bookings.checked_in_at/by, 0003 site_settings map_* columns
vercel.json                cron
```

Import alias `@/*` -> `src/*`. All tables re-exported from `@/db/schema`.

## 7. Code conventions

1. Server-only modules start with `import "server-only"`. `"use client"` only where needed.
2. **Server actions never throw to the client.** Return `{ ok: true, data }` or
   `{ ok: false, error, needsLogin?, needsVerify? }`. Check the session and the **role inside every
   action** (the admin layout check is not enough). Validate with Zod.
3. **Never trust prices, times, amounts or ids from the browser.** Re-read them on the server.
4. Pages are server components that fetch and pass plain props to client components. Pages reading
   the session or live data: `export const dynamic = "force-dynamic"` (the root layout already is).
5. Any client component using `useSearchParams()` must be wrapped in `<Suspense>` by its page.
6. **Time:** only via `src/lib/time.js` (Asia/Dhaka). Never `new Date().getHours()` on the server and
   never `toLocaleDateString` in server-rendered components (hydration mismatch); use `shortDateLabel()`.
7. **Images the admin controls:** `<Image unoptimized={!canOptimize(src)} />` (`src/lib/utils.js`).
   `next.config.mjs` allows `images.unsplash.com` and `res.cloudinary.com`. QR codes are data URLs in a
   plain `<img>` (lint warning accepted).
8. Money: `taka(n)` -> "৳1,800". Times: `time12("18:30")` -> "6:30 pm".
9. Unique violations: check `err.code === "23505"` (also `err.cause.code`) and return a friendly error.
10. Don't use the `action()` wrapper in `src/lib/action.js` as is: it calls `requireRole`, whose
    `redirect()` throws inside its try/catch and becomes "Something went wrong". Write actions like
    `src/features/admin/actions/bookings.js` (explicit `requireAdmin()` returning `DENIED`).
11. **API keys and secrets never hard-coded.** Always `process.env.X`, checked by `src/lib/env.js`.
12. Slow side effects after a response (emails) go through `waitUntil(promise.catch(...))` from
    `@vercel/functions`, so a failed email never fails the booking or payment.
13. Browser-only libraries (Leaflet) load via a client wrapper with `next/dynamic(..., { ssr: false })`.

Server action template:

```js
// src/features/<feature>/actions/<name>.js
"use server";

import { headers } from "next/headers";
import { updateTag, revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { TAGS } from "@/lib/cache-tags";

async function requireRoles(roles) {
    const session = await auth.api.getSession({ headers: await headers() });
    const u = session?.user;
    return u && roles.includes(u.role) ? u : null;
}

const schema = z.object({ /* ... */ });

export async function saveThing(input) {
    try {
        const user = await requireRoles(["admin"]);
        if (!user) return { ok: false, error: "You don't have access to this." };
        const parsed = schema.safeParse(input);
        if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
        // ... db work
        updateTag(TAGS.hero);            // public site shows the change on the next request
        revalidatePath("/admin/hero");
        return { ok: true, data: null };
    } catch (err) {
        console.error("[saveThing]", err);
        return { ok: false, error: "Couldn't save. Try again." };
    }
}
```

## 8. Design system and copy

Tailwind v4 `@theme` tokens in `src/app/globals.css`: `chalk` #f6f8f3 (page bg), `paper`, `pitch`
#0b3b2c / `pitch-2` / `pitch-3` (dark green), `grass`, `line`, `ink` #0f1f19 / `ink-2` / `ink-3` /
`ink-4`; `brand` = `var(--brand)` (admin-set, default #18a058) with `brand-soft`, `brand-deep`,
`brand-ink`; `flare` #ffb020 only for offers and "on hold"; `danger`, `danger-soft`.

Radii: `rounded-frame` 28px (big sections), `rounded-card` 20px, `rounded-ctl` 14px. Utilities:
`display`, `wide`, `tnum`, `no-scrollbar`. Font: Archivo via `next/font/google`.

Visual motifs: chalk pitch lines (`PitchLines`), ticket perforations (dashed lines) on cards. Map pin and
chip use `--brand` and `pitch`. Keep new screens consistent; reuse `components/ui` and `components/admin/Kit`.

Copy: sentence case; buttons say exactly what happens; errors say what to do next; no ALL-CAPS labels.

## 9. Domain rules

### Roles

`user.role`: `user` (player), `editor` (CMS content only), `admin` (everything). **Editor is still live
in the code**: the admin layout and the content pages (hero, banners, sections, footer, media, terms)
call `requireRole(["admin", "editor"])`; `CONTENT_ROLES = ["admin", "editor"]` in
`cms/server-utils.js`; the Users page role dropdown offers Admin, Editor, Player. Branding, navigation,
grounds, bookings, payments, coupons, users and ticket check-in are admin only (`adminOnly` in
`AdminShell`, `ADMIN_ONLY` in actions). (An earlier version of this file said 7a removed editor; it did
not. If the client wants editor gone, that is a new task.)

### Registration and email verification (Step 7a)

- Better Auth `emailOTP` plugin: 6 digits, 5 min, 3 attempts. `requireEmailVerification: false`, so
  unverified users can still sign in (to reach `/verify-email`).
- After `signUp.email()` in `RegisterForm`, the client calls
  `authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })` and pushes to
  `/verify-email?email=…&next=…`. On the server, `sendVerificationOTP` calls `sendOtpEmail` in
  `features/auth/emails.js`, which calls `sendBrevoEmail` in `lib/brevo.js`.
- `/verify-email` uses `authClient.emailOtp.verifyEmail({ email, otp })`; on success, back to `?next=`
  (default `/`). "Send a new code" calls `sendVerificationOtp` again.
- Booking is blocked for unverified users: `createBookingHold` and `payForBooking` return
  `{ ok: false, needsVerify: true, error }`. `/book` passes `emailVerified` to `BookingClient`, which
  shows a "Verify your email to book" banner and sends Pay to `/verify-email?next=<same ground/date>`.
- Registration only. Login has no OTP. Google sign-in skips OTP (Google accounts come verified).

### Admin sees player name and phone

`getAdminBookings` left-joins `user` and returns `customerName || userName` plus
`customerPhone || userPhone` (booking snapshot first). `getLatestBookings` and `getTodayBoard` use the
same shape. The bookings table search covers name, phone, email and booking ID.

### QR tickets and check-in (Step 7b)

- **Token** (`lib/ticket-token.js`, pure, `node:crypto`): `base64url("<bookingId>|<issuedAtSeconds>")`
  + `.` + `base64url(HMAC-SHA256(payload))`, key `TICKET_SECRET || BETTER_AUTH_SECRET`. Valid for 365
  days. `verifyTicketToken(token)` -> `{ bookingId }` or `null`, never throws, timing-safe compare.
  `ticketVerifyUrl(bookingId)` -> `APP_URL/verify/<token>`. A new token is minted on every render
  (`issuedAt` changes), so the QR image changes between page loads; every one of them verifies.
- **The QR only proves we issued it.** The booking state is always re-read from the DB.
- **On screen:** `getMyBookings` adds `ticketToken` and `qrDataUrl` (PNG data URL from
  `lib/qrcode.js` `qrDataUrlForUrl`, 240 px) for bookings whose shown status is `confirmed` (not
  completed/past). `BookingTicket` shows a 72 px QR; `TicketDialog` shows a 200 px one ("Show this at the gate").
- **By email:** `features/auth/ticket-email.js`. `sendBookingReceiptByBookingId(bookingId)` loads the
  booking, user email, sheet `dayStart` and site settings, then `sendTicketEmail` sends a Brevo email
  (code, ground, date, time with "(after midnight)", player, payment, QR image, verify link). The QR in
  the email is an `<img src="APP_URL/api/ticket-qr/<token>">` (email clients block data URLs); that
  route verifies the signature and returns a PNG with `Cache-Control: immutable`.
- **When the receipt is sent:** automatically after a payment confirms a held/expired booking
  (`settleBooking` in `payment/service.js`) and after a free (100% off) booking (`createBookingHold`),
  both via `waitUntil`. Players can resend with **Email receipt** in My bookings
  (`resendTicketEmail(bookingId)` in `booking/actions-email.js`: own booking, confirmed only).
  Walk-ins get no email (no user).
- **`/verify/[token]`** (server page, **public, no sign-in**): invalid token -> "Not a TurfZone
  ticket"; booking missing -> "Booking not found"; else one state, checked in this order:
  `cancelled`, `expired`, `unpaid` (held), `refunded` (refund_due/refunded), `played` (slot start is
  past), `invalid` (any other non-confirmed), else `valid`. Shows code, ground, play date (+ "Night of"),
  time, player, amount, checked-in time. **Only a signed-in admin** sees **Mark as used**, and only for
  `valid` and not yet checked in. A checked-in ticket still shows the green "valid" card plus a
  "Checked in" row (there is no separate amber state).
- **Check-in** `features/admin/actions/checkin.js` `markTicketUsed({ bookingId })`: admin only,
  idempotent conditional update (`status = confirmed AND checked_in_at IS NULL`) sets `checkedInAt`,
  `checkedInBy`; returns an error if already used. `revalidatePath("/admin/bookings")`. No `audit_log` row.

### Venue map (Step 7c)

- `site_settings.map_lat`, `map_lng` (double), `map_zoom` (int), `map_label`, `map_address` (text).
- Admin, Branding, **Map location**: latitude, longitude, zoom (2 to 19), label (40), address (120),
  plus an "Open Google Maps" link to copy coordinates. `saveBranding` validates (empty = null),
  `updateTag(TAGS.settings)`.
- `toSettings()` returns `settings.map = { lat, lng, zoom (default 16, clamped 2-19), label, address }`
  or `null` when lat/lng are empty. Home page passes `settings.map` to `VenueInfo`.
- `VenueInfo` (server) renders `VenueMapLoader` (client, `next/dynamic` `ssr: false`) -> `VenueMap`
  (react-leaflet, OSM tiles, brand-coloured `divIcon` pin, popup with label/address, scroll-zoom off,
  re-centres on change). No map -> the illustrated `MapArt`. "Get directions" still uses
  `contact.mapUrl` (Footer & SEO).

### Booking (ported from the prototype)

- Each pitch has `defaultBlocks` JSON `[{ startTime, endTime, price, sortOrder }]`, ids `default-<i>`.
  A date with rows in `time_blocks` uses those instead (per-date custom schedule, uuid ids).
- **Day start (per sheet):** a "sheet" is one ground's slots for one date. Its day starts at its first
  slot (`dayStartOf(blocks)`, minutes). A slot starting earlier than that is played after midnight on
  the next calendar day but stays on that sheet. `DEFAULT_DAY_START` is the fallback for an empty sheet.
- **Past slots:** `isBlockPast(date, start, dayStart)` compares the slot's real start with the time in
  Dhaka. Always pass the sheet's `dayStart` (`resolveBlock()` returns it as `block.dayStart`,
  `getSheetDayStarts` gives it for booking rows).
- **"Today":** `currentVenueDay()` (booking queries). Yesterday stays "today" only while an open
  ground's sheet for yesterday still has after-midnight slots running.
- Parts of the day: `features/booking/parts.js`.
- Slot states: free, held (unexpired hold), booked (confirmed), past.
- Hold: `status = held`, `holdExpiresAt = now + 15 min`, price from the server. Max 2 active holds.
- **No double booking:** partial unique index `bookings_active_slot_uq` on
  `(pitch_id, booking_date, start_time) WHERE status IN ('held','confirmed')`.
- Statuses: held, confirmed, cancelled, expired, completed. paymentStatus: unpaid, paid, refund_due,
  refunded. source: online, walk_in.
- Admin: walk-in bookings are confirmed immediately; cancelling a paid booking sets `refund_due`;
  "Mark refunded" sets `refunded` (refunds themselves are manual).

### Payments (SSLCommerz hosted checkout)

- `payForBooking(bookingId)` -> `startPayment`: unverified users are refused with `needsVerify: true`.
  Booking must be the player's and held; stretches the hold to 15 min from now; inserts a `payments`
  row (initiated); calls SSLCommerz init; client does `window.location.assign(url)`.
- Callback `POST /api/payment/sslcommerz/[event]`: success -> `confirmPayment`; fail/cancel -> payment
  marked failed/cancelled, booking stays held so the player can retry; ipn -> same as success.
- `confirmPayment({ tranId, valId })` trusts only the Validation API. Claims the payment with
  `UPDATE ... WHERE status <> 'paid' RETURNING`, so browser + IPN + cron racing confirm once. Then
  `settleBooking`: booking held/expired -> confirmed + paid, coupon redeemed, **receipt email queued**;
  slot gone / booking cancelled -> cancelled + refund_due; booking already paid -> this payment refund_due.
- `/payment/success?tran=` re-asks SSLCommerz once if the payment is still initiated. The cron route
  re-checks payments opened 5 to 120 min ago and expires holds.
- Payments row statuses: initiated, paid, failed, cancelled, refund_due, refunded.
- Pay buttons only show when `isSslczConfigured()`.

### Coupons (Step 6 part 1)

- Rules in `features/coupons/rules.js` `evaluateCoupon(coupon, ctx)` (pure): active; inside dates;
  usageLimit vs usedCount + active holds using the code; perUserLimit vs redemptions + own active
  holds; minAmount; pitchIds; timeWindow on the operating-day clock. Percent capped by maxDiscount;
  discount never exceeds price.
- `/book`: `previewCoupon` (server, prices re-read). `createBookingHold({ ..., couponCode })`
  re-validates and stores subtotal, discount, totalPrice, couponId.
- Total 0 (100% off): booking confirmed + paid at once, no SSLCommerz, `data.free = true`, receipt emailed.
- `redeemCoupon(bookingId)` inserts `coupon_redemptions` and bumps usedCount once per booking.
- Admin (`/admin/coupons`, `actions/coupons.js`): create/edit, on/off, delete (refused once used).

### Admin payments and users (Step 6 part 1)

- `/admin/payments?status=paid|started|failed|refund_due|refunded|risky&q=&page=` (25 per page).
- `/admin/users?q=`: `setUserRole({ userId, role })` with role `admin | editor | user`, admin only;
  you can't change your own role; the last admin stays admin.

### Profile, terms, ticket (Step 6 part 2)

- `/profile` (sign-in required): name + mobile via `updateProfile`, email read-only, change password,
  booking counts, sign out.
- `/terms`: `page_sections` row `terms`, defaults (`DEFAULT_TERMS`) until saved in Admin, Booking terms.
- Show ticket (My bookings, confirmed only): `TicketDialog` with booking code, ground, real play date,
  time, player, payment, QR, Add to calendar.
- Env check: `src/instrumentation.js` -> `assertEnv()` on server start. Warns about missing Brevo vars
  and missing/short `TICKET_SECRET`.

### CMS reads (Step 4)

`src/features/cms/queries.js`: every read is `unstable_cache` with a tag from `src/lib/cache-tags.js`
and a 5-minute safety revalidate, and falls back to defaults if the DB fails. Writes must call
`updateTag(TAGS.<x>)` for the matching tag.

### CMS writes and uploads (Step 5)

- Save actions in `src/features/cms/actions/`: settings (branding incl. map, menu, footer/SEO,
  slider), hero, banners, sections (incl. terms), media.
- Every save calls `updateTag(TAGS.x)` and `revalidatePath("/admin/...")`.
- Uploads: browser gets a signature from `getUploadSignature(folder)`, posts to Cloudinary, then
  `saveMedia` stores it only if Cloudinary's response signature verifies. `deleteMedia` refuses while
  the image is used.

## 10. Database (Drizzle, `src/db/schema/`)

- `auth.js`: `user` (id text, name, email, emailVerified, image, phone, role), `session`, `account`,
  `verification` (Better Auth's own table; the OTP plugin stores codes here).
- `booking.js`: `pitches`, `time_blocks`.
- `commerce.js`: `coupons`, `bookings` (code, userId, customerName, customerPhone, pitchId,
  timeBlockId, bookingDate, startTime, endTime, subtotal, discount, totalPrice, couponId, status,
  paymentStatus, source, holdExpiresAt, cancelledAt, cancelReason, **checkedInAt** (timestamp),
  **checkedInBy** (-> user.id, on delete set null)), `coupon_redemptions`, `payments`, `audit_log`.
- `cms.js`: `site_settings` (incl. **mapLat, mapLng, mapZoom, mapLabel, mapAddress**), `nav_items`,
  `hero_slides`, `promo_banners`, `page_sections`, `media`.
- Migrations: `0000_material_ravenous`, `0001_demonic_freak`, `0002_rapid_wonder_man` (check-in),
  `0003_yummy_thunderbolt` (map).

Schema changes: edit the schema file -> `npm run db:generate` -> `npm run db:migrate`. Give both commands.

## 11. Key module APIs (use these, don't re-invent)

- `lib/time.js`: `DEFAULT_DAY_START`, `dhakaDate`, `dhakaTime`, `hhmmToMinutes`, `minutesToHHMM`,
  `addDaysISO`, `dayStartOf`, `isAfterMidnight`, `operatingMinutes`, `playDateOf`,
  `isBlockPast(date, start, dayStart)`, `nightEndOf`, `currentOperatingDay`, `shortDateLabel`.
  "Today": `currentVenueDay()` in `features/booking/queries.js`.
- `lib/guards.js`: `getSession()`, `requireUser(next)`, `requireRole(roles)`.
- `lib/sslcommerz.js`: `isSslczConfigured`, `initSession`, `validateOrder`, `queryTransaction`, `prettyMethod`.
- `lib/brevo.js`: `sendBrevoEmail({ to, subject, html, text })` -> POST Brevo `/v3/smtp/email`.
  Throws on missing env or a non-2xx response.
- `lib/ticket-token.js`: `signTicket(bookingId, now?)`, `verifyTicketToken(token, now?)`,
  `ticketVerifyUrl(bookingId, now?)`.
- `lib/qrcode.js` (server-only): `qrDataUrlForUrl(url)` -> PNG data URL (240 px, EC level M).
- `features/auth/emails.js`: `sendOtpEmail({ email, otp })` (throws on failure).
- `features/auth/ticket-email.js`: `sendTicketEmail({ email, booking, site })`,
  `sendBookingReceiptByBookingId(bookingId)` -> `{ ok }` / `{ ok:false, error }` (never throws).
- `features/booking/queries.js`: `currentVenueDay`, `getSheetDayStarts`, `getPitches`, `getPitchById`,
  `toPitchView`, `getTimeBlocksForPitch`, `resolveBlock`, `getTakenSlots`, `getSlotBoard`,
  `getGroundsToday`, `expireStaleHolds`, `getMyBookings` (with `ticketToken`, `qrDataUrl`),
  `getBookingForUser`, `HOLD_MINUTES`.
- `features/booking/actions.js`: `previewCoupon`, `createBookingHold` (`needsVerify`; free -> receipt),
  `cancelHeldBooking`. `actions-email.js`: `resendTicketEmail(bookingId)`.
- `features/booking/calendar.js`: `isAfterMidnight(b)`, `playDate(b)`, `calendarUrl(b)`, `longDateLabel`.
- `features/coupons/service.js`: `getCouponByCode`, `couponUses`, `checkCouponForSlot`, `redeemCoupon(bookingId)`.
- `features/admin/commerce-queries.js`: `getCouponsAdmin`, `getPaymentsAdmin(filters)`, `getUsersAdmin({ q })`.
- `features/admin/queries.js`: dashboard stats, today board, latest bookings, `getAdminBookings(filters)`,
  pitch admin reads, `getPitchEditorData`.
- `features/admin/actions/{pitches,bookings}.js`: ground CRUD, slot schedule edits, cancel, mark refunded,
  walk-in booking. `actions/checkin.js`: `markTicketUsed({ bookingId })`.
- `features/cms/queries.js`: `getSiteSettings` (incl. `map`), `getNavItems`, `getHeroSlides`,
  `getPromoBanners`, `getSections`, `getTerms`, `getSiteChrome`, `brandInk`.
- `features/payment/service.js`: `startPayment`, `confirmPayment`, `recheckPayment`,
  `recheckOpenPayments`, `markPaymentClosed`, `getPaymentResult`. `actions.js`: `payForBooking` (`needsVerify`).

## 12. Remaining work

### Before deploy (small, recommended)

- **Update `DEPLOY.md`**: add `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `TICKET_SECRET`
  (and optional `APP_NAME`) to the Vercel env table and step 3 secrets; add final checks for
  register-with-code, receipt email, QR scan -> `/verify/...` -> Mark as used; set the map in Branding.
- **robots.js**: add `/verify` and `/verify-email` to `disallow` (verify pages show player names).
- **Admin bookings table**: "Checked in" column + optional `?checkedIn=yes|no` filter. Planned in 7b,
  not built: `getAdminBookings` doesn't select `checkedInAt` yet.
- Optional polish: `/verify` shows 24-hour times (`startTime to endTime`); switch to `time12()`.
  `VerifyTicket` copy hard-codes "TurfZone" instead of the CMS site name.
- Decide with the client: should `/verify/<token>` stay public (anyone holding the QR sees name,
  ground, time, amount) or require staff sign-in? Currently public; check-in is admin only.

### Deploy

Follow `DEPLOY.md`: separate Neon branch, `db:migrate` (applies 0000 to 0003) + seed, Vercel env vars
(incl. Brevo + `TICKET_SECRET`), domain, Google OAuth redirect, owner promoted to admin, live
SSLCommerz store + IPN URL `https://<domain>/api/payment/sslcommerz/ipn`, `SSLCZ_IS_LIVE=true`, daily
Vercel cron + external 15-minute cron (cron-job.org with `Authorization: Bearer <CRON_SECRET>`).
Refunds stay manual. `TICKET_SECRET` on live must never change after tickets go out.

### Optional later

- Write admin actions (incl. check-in) to `audit_log` (table exists, unused).
- SMS confirmation (email receipts already exist).
- SSLCommerz refund API (needs a fixed server IP).
- Remove the editor role if the client doesn't need it.

## 13. Known issues and gotchas

| Issue | Fix / note |
|---|---|
| `SEED_ADMIN_EMAIL`, `CRON_SECRET` placeholders in `.env.local` | Set real values (section 3) |
| `column "map_lat" does not exist` / `"checked_in_at" does not exist` | Migrations 0002/0003 not applied: `npm run db:migrate` |
| `BREVO_*` missing | OTP and receipt emails fail; unverified users can't book. Set all three |
| Brevo returns 401/403 | `BREVO_API_KEY` wrong, or `BREVO_SENDER_EMAIL` isn't a verified sender in Brevo |
| `/verify-email` shows "That code didn't work" | OTP expired (5 min), attempts used (3), or wrong email; use "Send a new code" |
| Paid but no receipt email | Check logs for `[ticket-email:after-pay]` / `[ticket-email]`; player can press **Email receipt** in My bookings |
| QR image broken in the email | `APP_URL` is localhost or wrong (mail clients load `APP_URL/api/ticket-qr/...`) |
| QR page says "Not a TurfZone ticket" | `TICKET_SECRET` (or `BETTER_AUTH_SECRET` fallback) changed since issue, token older than 365 days, or tampered |
| QR opens on localhost from a phone | `APP_URL` is localhost; scan tests need the deployed domain or a LAN/tunnel URL in `APP_URL` |
| No "Mark as used" button on `/verify/...` | The phone isn't signed in as **admin** (page is public), the ticket isn't valid, or it's already checked in |
| Map section shows the illustration | Latitude/longitude empty in Admin, Branding, Map location |
| `window is not defined` from Leaflet | Import `VenueMap` only through `VenueMapLoader` (`ssr: false` in a client file) |
| Map tiles grey/missing | Browser can't reach `tile.openstreetmap.org` (network/ad blocker) |
| Upload says "Image uploads aren't set up yet" | Cloudinary keys missing in `.env.local` |
| Change saved but home page still old | The action must call `updateTag(TAGS.x)` for the tag the public read uses |
| `src/lib/action.js` turns `requireRole` redirects into a generic error | Don't use it (section 7, rule 10) |
| Lint `react-hooks/set-state-in-effect` | Don't reset state in an effect on prop change |
| Lint warning `no-img-element` in BookingTicket/TicketDialog | Intentional (QR data URLs); not an error |
| `[env]` lines at start-up | Missing/placeholder env vars (`src/lib/env.js`) |
| Turbopack crash | Keep `--webpack` |
| Build fails fetching Archivo | Machine can't reach fonts.googleapis.com; build online |
| `useSearchParams() should be wrapped in a suspense boundary` | Wrap in `<Suspense>` in the page |
| Hydration error on dates | `shortDateLabel()`, not locale APIs |
| `next/image` "hostname not configured" | `unoptimized={!canOptimize(src)}` or add the host to `next.config.mjs` |
| Payment callback 404 | Route file not at `src/app/api/payment/sslcommerz/[event]/route.js` |
| IPN never arrives locally | Expected; works after deploy |
| Migration "relation exists" | `db:push` was used before; don't mix push and migrate |

There is no test suite in the repo. Verify with `npm run build` and click-through steps in the browser.

## 14. End of every session

1. `npm run build` passes, `npm run lint` has 0 errors.
2. Update this file (sections 3, 5, 6, 9, 10, 11, 12, 13), `Agents.md` (sections 2, 6, 8, 9, 10) and
   `CLAUDE.md` (layout + known gaps) to match the code.
3. Deliver files with paths and new/replace, plus installs, migrations and test steps.

**What changed in this version (25 Oct):** Step 7b and 7c recorded as done; status table, env table
(`TICKET_SECRET` live, `APP_NAME`), project map (verify page, ticket-qr route, VerifyTicket, VenueMap,
ticket-email, actions-email, checkin, qrcode), stack (qrcode, leaflet, react-leaflet,
@vercel/functions), new domain sections "QR tickets and check-in" and "Venue map", schema (check-in
and map columns, migrations 0002/0003), APIs, remaining work (DEPLOY.md, robots, checked-in column),
gotchas. Corrected: the editor role was never removed; `/verify` is public, not admin-only; no amber
"already checked in" state.