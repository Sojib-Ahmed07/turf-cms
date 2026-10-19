# AI_CONTEXT.md: TurfZone CMS handoff

Paste this whole file into a new chat (Claude, Gemini, DeepSeek, any model) before asking for work,
then attach the source files the task touches. It is self-contained: everything a new model needs to
continue the project without the old chat. Last updated **19 Oct 2026**, after Steps 1 to 6 (all build
steps done) and Step 7 part 1 (admin sees phone, Brevo email OTP at registration, booking gate).

In the repo, `Agents.md` holds the same facts in more detail (file tables, changelog) and `CLAUDE.md`
holds Claude Code's working rules. If this file and the code disagree, the code wins; fix this file.

---

## 1. The project in one paragraph

TurfZone CMS is a turf-booking website for **one venue** in Mirpur 12, Dhaka, Bangladesh (sample name
"TurfZone", three grounds, open 6 am to 3 am, prices in BDT ৳). Built for a client.
Players pick a ground, a date and a time
block, pay online through **SSLCommerz** (bKash, Nagad, Rocket, cards) and get a booking ticket. The
**design is fixed in code**; the admin edits content only: logo, brand colour, hero slider, offer
banners, menu labels, home sections, footer, SEO, grounds and slot schedules. The UI was designed new;
the booking logic was ported from an earlier prototype (`turf.zip`, bKash replaced by SSLCommerz).

## 2. How the developer works (follow this or the answer can't be used)

- **JavaScript only. No TypeScript**, no `.ts/.tsx`, no type annotations.
- Windows + PowerShell, project at `D:\projects\turf-cms`, env file is **`.env.local`**.
- Deliver **complete files**, never diffs or "rest unchanged" snippets. **Line 1 of every file is its
  path as a comment**: `// src/features/booking/queries.js` (JSON files can't hold comments; say the path).
- **No zip files.** Send files one by one and say for each: new or replace, and the exact folder.
  Use Windows paths in instructions (`src\app\api\...`). Spell out bracket folders exactly
  (`[event]`, `[id]`, `[...all]`), they have been misplaced before.
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
| 1 | Booking, player side: live slots, 15-min holds, My bookings | Done |
| 3 | Booking, admin side: overview, grounds + slot editor, bookings table, walk-ins, cancel/refund | Done |
| 4 | CMS read side: whole public site reads settings/nav/hero/banners/sections from the DB | Done |
| 2 | SSLCommerz payments: pay, callbacks, IPN, result pages, retry, lost-payment recheck, cron | Done (build + 38 integration tests + browser e2e against a mock gateway; being tested in the real sandbox) |
| 5 | CMS write side: Cloudinary uploads, media library, branding, navigation, hero, banners, sections, footer/SEO editors | Done (build + 58 integration tests + browser e2e against a mock Cloudinary on a production server) |
| 6a | Coupons at checkout (incl. free bookings), real Coupons, Payments and Users admin pages | Done 15 Oct (build + 52 integration tests + browser e2e on a production build) |
| 6b | Profile and terms pages (+ terms editor), Show ticket, loading/error/404, sitemap/robots, env check, lint clean, `DEPLOY.md` | Done 15 Oct (build + browser e2e on a production build) |
| **7a** | **Admin sees player name + phone (already worked via the existing `getAdminBookings` join); Brevo email OTP at registration (Better Auth `emailOTP` plugin); unverified players blocked from holding and paying** | **Done 19 Oct (build; verify OTP end-to-end via Brevo sandbox + browser)** |
| **7b** | **QR code on tickets + admin `/verify/<token>` page + check-in state** | **Next** |
| **Deploy** | **Vercel + live Neon branch + domain + live SSLCommerz, following `DEPLOY.md`** | **After Step 7** |

The local project was checked file by file on 15 Oct (before Step 6): identical to the delivered code (his
editor reformats whitespace; that's fine). The sample-data files are deleted in Step 6 part 1.

Open items on the developer's side:
- `.env.local` still has placeholders for `SEED_ADMIN_EMAIL` and `CRON_SECRET`. To get an admin:
  set the real email, register on the site, run `npm run db:seed` again.
- SSLCommerz sandbox: store ID/password go in `.env.local`; Pay buttons stay hidden until both are set.
- Cloudinary keys are empty in `.env.local` (as of 15 Oct), so admin uploads are off until they're added back.
- The default booking terms are a draft; the venue must check them in Admin, Booking terms.
- The seeded FIRST200 popup (Offer banners) is still switched off; turn it on now that coupons work.
- **Brevo**: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` are required for registration to
  work. `BREVO_SENDER_EMAIL` must be a verified sender or domain in Brevo, or sends are rejected.
  Without them, registration codes can't be emailed and (since unverified users can't book) new players
  can't book.

## 4. Stack and commands

Next.js **16.4** (App Router, webpack dev), React **19.3**, Tailwind **v4**, Drizzle ORM 0.45 +
drizzle-kit 0.31, **Neon Postgres** (`@neondatabase/serverless`, neon-http driver), **Better Auth** 1.7
(email/password + Google, `role` and `phone` extra fields, `emailOTP` plugin), Zod 4, framer-motion,
lucide-react, embla-carousel (hero), clsx + tailwind-merge. Cloudinary is used without its SDK
(signed REST calls, `src/lib/cloudinary.js`). Brevo transactional email via REST
(`src/lib/brevo.js`). Planned: Vercel hosting.
npm run dev # next dev --webpack (Turbopack crashes on this machine; keep --webpack)
npm run build # must pass before delivering
npm run lint # clean; keep it that way
npm run db:generate # after editing src/db/schema/*, then
npm run db:migrate # apply to Neon (never mix with db:push on the same DB)
npm run db:seed # idempotent: settings, nav, sections, hero, banners, coupons, 3 pitches, admin promotion
npm run db:studio

text

**Next 16 differences that bite:** `src/proxy.js` replaces `middleware.js`; `params`, `searchParams`,
`headers()`, `cookies()` are async (await them); `revalidateTag(tag, "max")` needs two arguments;
`updateTag(tag)` exists for server actions (immediate expiry, use it after admin saves). When unsure,
read `node_modules/next/dist/docs/` before writing code.

## 5. Environment variables (`.env.local`, names only)

| Name | Used for |
|---|---|
| `APP_URL` | Public site URL. SSLCommerz callback URLs and metadata base are built from it |
| `DATABASE_URL` | Neon pooled connection string |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Auth (URL = site URL) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google sign-in |
| `SEED_ADMIN_EMAIL` | Seed promotes this registered user to admin |
| `CRON_SECRET` | Bearer token for `/api/cron/expire-holds` (Vercel Cron sends it automatically) |
| `SSLCZ_STORE_ID`, `SSLCZ_STORE_PASSWORD`, `SSLCZ_IS_LIVE` | Payments (`false` = sandbox) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Uploads (only these three needed). Optional `CLOUDINARY_FOLDER` (default `turfzone`). Old name `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` still works |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Registration email OTP (Brevo transactional email). Sender must be verified in Brevo |
| **`TICKET_SECRET`** *(Step 7b)* | HMAC key for signing QR ticket tokens. 32+ random chars. Falls back to `BETTER_AUTH_SECRET` if unset (not recommended for production) |

`SSLCZ_API_BASE` and `CLOUDINARY_API_BASE` exist only to point tests at mocks; never set them in real env files.
Never print, log or commit `.env.local`.

## 6. Project map
src/
proxy.js cookie check → /login for /admin, /bookings, /profile
app/
layout.jsx root: font, brand colour + SEO from site settings, force-dynamic
(site)/ public: layout (top bar, navbar, footer, popup), / , /book, /bookings,
/profile, /terms, /payment/success|failed|cancelled;
/verify/[token] ← new in Step 7b; loading.jsx, error.jsx
not-found.jsx, global-error.jsx, sitemap.js, robots.js
(auth)/ /login, /register, /verify-email ← verify-email new in Step 7a
admin/ layout (requireRole admin); page (overview); pitches/, pitches/[id]/;
bookings/, branding, navigation, hero, banners, sections, footer, media,
terms, coupons, payments, users
api/auth/[...all]/route.js Better Auth
api/booked-slots/route.js slot board JSON for /book and walk-ins
api/payment/sslcommerz/[event]/route.js POST success | fail | cancel | ipn
api/cron/expire-holds/route.js daily housekeeping (vercel.json: 21:00 UTC = 3 am Dhaka)
components/
ui/ Button, Badge, Dialog, Field/Input, Inputs, Switch
site/ Navbar, TopBar, Footer, FooterCta, Logo, HeroSlider, QuickBook, PromoBanner,
PromoPopup, LiveGrounds, HowItWorks, VenueInfo, PitchLines
admin/ AdminShell, Kit (PageHeader, Panel, SettingRow, Label, SaveBar, OrderButtons, Table/Th/Td,
Toolbar), ImageUploader, MediaPicker, Toast (useToast), StatusBadge, TonightBoard,
TicketCard ← Step 7b, verification card
auth/ AuthForms, AuthLayout, VerifyEmailForm ← VerifyEmailForm new in Step 7a
features/
auth/
emails.js ← new in Step 7a: sendOtpEmail({ email, otp }) via Brevo
booking/ queries.js, actions.js (emailVerified gate), slots.js, calendar.js,
ticket-token.js ← Step 7b (sign/verify HMAC), components/ (TicketDialog + QR)
profile/ actions.js (updateProfile), components/ProfileClient.jsx
admin/ queries.js, commerce-queries.js, actions/{pitches,bookings,coupons,payments,users,checkin}.js
← checkin.js new in Step 7b, components/
coupons/ rules.js, service.js
cms/ queries.js, admin-queries.js, server-utils.js, actions/*, upload-client.js, admin/ (8 editors)
payment/ service.js, actions.js (emailVerified gate), result-page.js, components/
db/ index.js, pool.js (unused), schema/{auth,booking,commerce,cms}.js, seed.js
lib/ auth (emailOTP plugin), auth-client (emailOtpClient), guards, action, time, utils,
cache-tags, sslcommerz, cloudinary, brevo ← new in Step 7a, ticket-token ← Step 7b, env
drizzle/ 0000 initial schema, 0001 booking FKs + unique active-slot index,
0002 ticket check-in (Step 7b)
vercel.json cron

text

Import alias `@/*` → `src/*`. All tables re-exported from `@/db/schema`.

## 7. Code conventions

1. Server-only modules start with `import "server-only"`. `"use client"` only where needed.
2. **Server actions never throw to the client.** Return `{ ok: true, data }` or
   `{ ok: false, error, needsLogin? }`. Check the session and the **role inside every action**
   (the admin layout check is not enough). Validate with Zod.
3. **Never trust prices, times, amounts or ids from the browser.** Re-read them on the server.
4. Pages are server components that fetch and pass plain props to client components. Pages reading
   the session or live data: `export const dynamic = "force-dynamic"` (the root layout already is).
5. Any client component using `useSearchParams()` must be wrapped in `<Suspense>` by its page.
6. **Time:** only via `src/lib/time.js` (Asia/Dhaka). Never `new Date().getHours()` on the server and
   never `toLocaleDateString` in server-rendered components (hydration mismatch); use `shortDateLabel()`.
7. **Images the admin controls:** `<Image unoptimized={!canOptimize(src)} />` (`src/lib/utils.js`).
   `next.config.mjs` allows `images.unsplash.com` and `res.cloudinary.com`.
8. Money: `taka(n)` → "৳1,800". Times: `time12("18:30")` → "6:30 pm".
9. Unique violations: check `err.code === "23505"` (also `err.cause.code`) and return a friendly error.
10. Don't use the `action()` wrapper in `src/lib/action.js` as is: it calls `requireRole`, whose
    `redirect()` throws inside its try/catch and becomes "Something went wrong". Write actions like
    `src/features/admin/actions/bookings.js` (explicit `requireAdmin()` returning `DENIED`).
11. **API keys and secrets never hard-coded.** Always `process.env.X`, checked by `src/lib/env.js`.

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
8. Design system and copy
Tailwind v4 @theme tokens in src/app/globals.css: chalk #f6f8f3 (page bg), paper, pitch #0b3b2c / pitch-2 / pitch-3 (dark green), grass, line, ink #0f1f19 / ink-2 / ink-3 /
ink-4; brand = var(--brand) (admin-set, default #18a058) with brand-soft, brand-deep,
brand-ink; flare #ffb020 only for offers and "on hold"; danger, danger-soft.

Radii: rounded-frame 28px (big sections), rounded-card 20px, rounded-ctl 14px. Utilities:
display, wide, tnum, no-scrollbar. Font: Archivo via next/font/google.

Visual motifs: chalk pitch lines (PitchLines), ticket perforations on cards. Keep new screens
consistent with existing ones; reuse components/ui and components/admin/Kit.

Copy: sentence case; buttons say exactly what happens; errors say what to do next; no ALL-CAPS labels.

9. Domain rules
Roles
user.role: user (player), admin (everything). The DB enum still allows editor for backward
compatibility, but Step 7a removed it from the UI (role dropdown) and from every requireRole /
requireRoles check. Treat editor as user if it ever appears.

Registration and email verification (Step 7a)
Better Auth emailOTP plugin, 6 digits, 5 min, 3 attempts, requireEmailVerification: false
so unverified users can still sign in (to reach /verify-email).

After signUp.email() in RegisterForm, the client calls
authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" }) and pushes to
/verify-email?email=…&next=…. sendVerificationOTP on the server calls sendOtpEmail in
features/auth/emails.js, which calls sendBrevoEmail in lib/brevo.js.

/verify-email page uses authClient.emailOtp.verifyEmail({ email, otp }). On success, back to
?next= (default /). Resend button calls sendVerificationOtp again.

Booking is blocked for unverified users:

createBookingHold returns { ok: false, needsVerify: true, error: "..." } if !user.emailVerified.

payForBooking returns the same if !user.emailVerified.

/book page passes emailVerified={Boolean(session?.user?.emailVerified)} to BookingClient.

BookingClient shows a yellow "Verify your email to book" banner and short-circuits handlePay
to /verify-email?next=<same ground/date>.

Registration only. Login has no OTP. Google sign-in skips OTP (Google accounts come verified).

Admin sees player name and phone
getAdminBookings already left-joins user and returns customerName || userName (the booking
snapshot, which is the customer at booking time) plus customerPhone || userPhone.

getLatestBookings (dashboard) and getTodayBoard (the TonightBoard) use the same shape.

No change was needed; the admin bookings table already shows name + phone.

Booking (ported from the prototype)
Each pitch has defaultBlocks JSON [{ startTime, endTime, price, sortOrder }], ids default-<i>.
A date with rows in time_blocks uses those instead (per-date custom schedule, uuid ids).

Day start (per sheet): a "sheet" is one ground's slots for one date. Its day starts at its
first slot (dayStartOf(blocks), minutes). A slot starting earlier than that is played after
midnight on the next calendar day but stays on that sheet. DEFAULT_DAY_START is the fallback for
an empty sheet.

Past slots: isBlockPast(date, start, dayStart) compares the slot's real start with the time in
Dhaka. Always pass the sheet's dayStart (resolveBlock() returns it as block.dayStart,
getSheetDayStarts gives it for booking rows).

"Today": currentVenueDay() (booking queries). Yesterday stays "today" only while an open
ground's sheet for yesterday still has after-midnight slots running.

Parts of the day: features/booking/parts.js.

Slot states: free, held (unexpired hold), booked (confirmed), past.

Hold: status = held, holdExpiresAt = now + 15 min, price from the server. Max 2 active holds.

No double booking: partial unique index bookings_active_slot_uq on
(pitch_id, booking_date, start_time) WHERE status IN ('held','confirmed').

Statuses: held, confirmed, cancelled, expired, completed. paymentStatus: unpaid, paid,
refund_due, refunded. source: online, walk_in.

Admin: walk-in bookings are confirmed immediately; cancelling a paid booking sets refund_due;
"Mark refunded" sets refunded (refunds themselves are manual).

Payments (SSLCommerz hosted checkout)
payForBooking(bookingId) → startPayment: unverified users are refused with needsVerify: true.
Booking must be the player's and held; stretches the hold to 15 min from now; inserts a payments
row (initiated); calls SSLCommerz init; client does window.location.assign(url).

Callback POST /api/payment/sslcommerz/[event]: success → confirmPayment; fail/cancel → payment
marked failed/cancelled, booking stays held so the player can retry; ipn → same as success.

confirmPayment({ tranId, valId }) trusts only the Validation API. Claims the payment with
UPDATE ... WHERE status <> 'paid' RETURNING, so browser + IPN + cron racing confirm once. Then:
booking held/expired → confirmed + paid; slot gone / booking cancelled → cancelled +
refund_due; booking already paid → this payment refund_due.

/payment/success?tran= re-asks SSLCommerz once if the payment is still initiated. The cron route
re-checks payments opened 5 to 120 min ago and expires holds.

Payments row statuses: initiated, paid, failed, cancelled, refund_due, refunded.

Pay buttons only show when isSslczConfigured().

Coupons (Step 6 part 1)
Rules in features/coupons/rules.js evaluateCoupon(coupon, ctx) (pure): active; inside dates;
usageLimit vs usedCount + active holds using the code; perUserLimit vs redemptions + own active
holds; minAmount; pitchIds; timeWindow checked on the operating-day clock. Percent capped by
maxDiscount; discount never exceeds price.

/book: previewCoupon (server, prices re-read). createBookingHold({ ..., couponCode })
re-validates and stores subtotal, discount, totalPrice, couponId.

Total 0 (100% off): booking confirmed + paid at once, no SSLCommerz, data.free = true.

redeemCoupon(bookingId) inserts coupon_redemptions and bumps usedCount once per booking.

Admin (/admin/coupons, actions/coupons.js): create/edit, on/off, delete (refused once used).

Admin payments and users (Step 6 part 1)
/admin/payments?status=paid|started|failed|refund_due|refunded|risky&q=&page= (25 per page).

/admin/users?q=: setUserRole({ userId, role }), admin only; you can't change your own role; the
last admin stays admin. Role dropdown offers admin and user only (Step 7a).

Profile, terms, ticket (Step 6 part 2)
/profile (sign-in required): name + mobile via updateProfile, email read-only, change password,
booking counts, sign out.

/terms: page_sections row terms, defaults (DEFAULT_TERMS) until saved in Admin, Booking terms.

Show ticket (My bookings, confirmed only): TicketDialog with booking code, ground, real play date,
time, player, payment, Add to calendar. Step 7b adds a QR code to the ticket.

Env check: src/instrumentation.js → assertEnv() on server start. Warns about missing Brevo vars.

CMS reads (Step 4)
src/features/cms/queries.js: every read is unstable_cache with a tag from src/lib/cache-tags.js
and a 5-minute safety revalidate, and falls back to defaults if the DB fails. Writes must call
updateTag(TAGS.<x>) for the matching tag.

CMS writes and uploads (Step 5)
Save actions in src/features/cms/actions/: settings, hero, banners, sections, media.

Every save calls updateTag(TAGS.x) and revalidatePath("/admin/...").

Uploads: browser gets a signature from getUploadSignature(folder), posts to Cloudinary, then
saveMedia stores it only if Cloudinary's response signature verifies. deleteMedia refuses while
the image is used.

10. Database (Drizzle, src/db/schema/)
auth.js: user (id text, name, email, image, phone, role), session, account,
verification (Better Auth's own table; the OTP plugin stores hashed codes here).

booking.js: pitches, time_blocks.

commerce.js: coupons, bookings (code, userId, customerName, customerPhone, pitchId,
timeBlockId, bookingDate, startTime, endTime, subtotal, discount, totalPrice, couponId, status,
paymentStatus, source, holdExpiresAt, cancelledAt, cancelReason, checkedInAt, checkedInBy ←
Step 7b), coupon_redemptions, payments, audit_log.

cms.js: site_settings, nav_items, hero_slides, promo_banners, page_sections, media.

Schema changes: edit the schema file → npm run db:generate → npm run db:migrate. Give both commands.

11. Key module APIs (use these, don't re-invent)
lib/time.js: DEFAULT_DAY_START, dhakaDate, dhakaTime, hhmmToMinutes, minutesToHHMM,
addDaysISO, dayStartOf, isAfterMidnight, operatingMinutes, playDateOf,
isBlockPast(date, start, dayStart), nightEndOf, currentOperatingDay, shortDateLabel.
"Today": currentVenueDay() in features/booking/queries.js.

lib/guards.js: getSession(), requireUser(next), requireRole(roles).

lib/sslcommerz.js: isSslczConfigured, initSession, validateOrder, queryTransaction,
prettyMethod.

lib/brevo.js (Step 7a): sendBrevoEmail({ to, subject, html, text }) → POST to Brevo
/v3/smtp/email. Throws on missing env or a non-2xx response.

features/auth/emails.js (Step 7a): sendOtpEmail({ email, otp }).

features/booking/queries.js: getPitches, getPitchById, toPitchView,
getTimeBlocksForPitch, resolveBlock, getTakenSlots, getSlotBoard, getGroundsToday,
expireStaleHolds, getMyBookings, getBookingForUser, HOLD_MINUTES.

features/booking/actions.js: previewCoupon, createBookingHold (needsVerify when the user
isn't verified), cancelHeldBooking.

features/coupons/service.js: getCouponByCode, couponUses, checkCouponForSlot,
redeemCoupon(bookingId).

features/admin/commerce-queries.js: getCouponsAdmin, getPaymentsAdmin(filters),
getUsersAdmin({ q }).

features/admin/queries.js: dashboard stats, today board, latest bookings, getAdminBookings(filters),
pitch admin reads, getPitchEditorData.

features/admin/actions/{pitches,bookings}.js: ground CRUD, slot schedule edits, cancel,
mark refunded, walk-in booking.

features/cms/queries.js: getSiteSettings, getNavItems, getHeroSlides, getPromoBanners,
getSections, getSiteChrome, brandInk.

features/payment/service.js: startPayment, confirmPayment, recheckPayment,
recheckOpenPayments, markPaymentClosed, getPaymentResult. actions.js: payForBooking
(needsVerify when the user isn't verified).

12. Remaining work
Step 7a (done 19 Oct)
Admin sees phone (already worked), Brevo email OTP at registration, unverified players blocked from
booking and paying. See "Registration and email verification" in section 9.

Env: add BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME in .env.local and on Vercel. The
sender must be verified in Brevo.

Step 7b (next)
QR code on every ticket + admin verify page + check-in state.

Token (signed, not raw): lib/ticket-token.js (server-only) signTicket(bookingId) →
base64url HMAC-SHA256 of bookingId + "." + issuedAt using TICKET_SECRET (or fall back to
BETTER_AUTH_SECRET); verifyTicketToken(token) → { bookingId } or null. Pure, no DB.

QR render: qrcode npm package (MIT, free, pure JS, server-side capable). Add to
TicketDialog.jsx and the inline BookingTicket.jsx. QR content = APP_URL/verify/<token>.

Route /verify/[token]/page.jsx: server component. requireRole(["admin"]) (staff scan
logged in). Decode token → load booking (pitch, user, payment). Render one of:

Green "Valid" with booking details + "Mark as used" button (when confirmed and not checked in).

Amber "Already checked in" with checkedInAt + checkedInBy.

Red for cancelled / refunded / expired / not found / invalid token.

Action features/admin/actions/checkin.js: markTicketUsed({ bookingId }), admin only,
idempotent (only sets if checkedInAt is null and status is confirmed). Writes checkedInAt = now,
checkedInBy = user.id. Optional audit_log row (same step).

Migration 0002: add checkedInAt timestamptz null and checkedInBy text null references user(id)
on bookings. npm run db:generate then npm run db:migrate.

Admin bookings table: "Checked in" column + optional ?checkedIn=yes|no filter.

Never trust the QR: the token proves the QR came from us; the booking state is always re-read.

Deploy (after Step 7)
Follow DEPLOY.md: separate Neon branch, migrate + seed, Vercel env vars (incl. Brevo + TICKET_SECRET),
domain, Google OAuth redirect, owner promoted to admin, live SSLCommerz store + IPN URL
https://<domain>/api/payment/sslcommerz/ipn, SSLCZ_IS_LIVE=true, daily Vercel cron + external
15-minute cron (cron-job.org with Authorization: Bearer <CRON_SECRET>). Refunds stay manual.

Optional later
Write admin actions to audit_log (table exists, unused).

Booking confirmation email/SMS (same Brevo integration can send it).

SSLCommerz refund API (needs a fixed server IP).

13. Known issues and gotchas
Issue	Fix / note
SEED_ADMIN_EMAIL, CRON_SECRET are placeholders in .env.local	Set real values (section 3)
BREVO_* missing	Registration OTP emails fail; unverified users can't book. Set all three
Brevo returns 401/403	BREVO_API_KEY wrong, or BREVO_SENDER_EMAIL isn't a verified sender in Brevo
/verify-email shows "That code didn't work"	OTP expired (5 min), attempts exhausted (3), or the wrong email; use "Send a new code"
Upload says "Image uploads aren't set up yet"	Cloudinary keys missing in .env.local
Change saved but home page still old	Make sure the action calls updateTag(TAGS.x) for the tag the public read uses
src/lib/action.js turns requireRole redirects into a generic error	Don't use it (section 7, rule 10)
Lint react-hooks/set-state-in-effect	Don't reset state in an effect on prop change
[env] lines at start-up	Missing/placeholder env vars (src/lib/env.js)
Turbopack crash	Keep --webpack
useSearchParams() should be wrapped in a suspense boundary	Wrap in <Suspense> in the page
Hydration error on dates	shortDateLabel(), not locale APIs
next/image "hostname not configured"	unoptimized={!canOptimize(src)} or add the host to next.config.mjs
Payment callback 404	Route file not at src/app/api/payment/sslcommerz/[event]/route.js
IPN never arrives locally	Expected; works after deploy
Migration "relation exists"	db:push was used before; don't mix push and migrate
QR says "Invalid"	TICKET_SECRET changed since the ticket was issued, or the token was tampered with
Admin QR scanner opens /verify/... but gets redirected to /login	The staff member isn't signed in on that phone; sign in as admin first
There is no test suite in the repo. Verify with npm run build and click-through steps in the browser.

14. End of every session
npm run build passes.

Update this file (sections 3, 5, 6, 9, 10, 11, 12, 13) and Agents.md (step plan + changelog) to
match the code.

Deliver files with paths and new/replace, plus installs, migrations and test steps.

text

**What changed since the last version:**
- Section 3: Step 7a done, 7b next, deploy after; open items add Brevo.
- Section 4: `emailOTP` plugin, Brevo.
- Section 5: added `BREVO_*` and reserved `TICKET_SECRET` for Step 7b.
- Section 6: new files (`lib/brevo.js`, `features/auth/emails.js`, `lib/auth-client.js` changed, `VerifyEmailForm.jsx`, `app/(auth)/verify-email/page.jsx`, and the future `ticket-token.js`, `/verify/[token]`, `checkin.js`).
- Section 7: added rule 11 (secrets never hard-coded).
- Section 9: new "Registration and email verification" and "Admin sees player name and phone"; "Roles" updated to admin/user only; `payForBooking` needsVerify noted.
- Section 10: `bookings.checkedInAt/checkedInBy` noted as Step 7b.
- Section 11: new APIs.
- Section 12: Step 7a done, Step 7b spec, Deploy updated (Brevo + TICKET_SECRET).
- Section 13: new rows for Brevo failures, OTP failures, QR failures.

Now send `src\db\schema\commerce.js` and we'll start Step 7b (QR).