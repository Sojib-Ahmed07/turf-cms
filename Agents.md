# AGENTS.md — TurfZone CMS, current progress

Read this file first in every new chat. It records what exists in the codebase right now, how it is
written, and what to do next. Last updated **26 Oct 2026** (after Steps 7a to 8b and the security review). `BLUEPRINT.md`
(the original end-state plan) is **not in the repo**; `ai-context.md` section 12 holds the remaining plan.

At the end of every session, update section 2 (Where things stand), section 8 (Step plan), section 10
(Changelog) and any file tables in section 6 that changed.

## 1. Project in one paragraph

TurfZone CMS is a turf-booking website for one venue in Bangladesh, built for a client.
Players register (email code), pick a ground, date and time block, pay directly with bKash or through SSLCommerz, and get a
booking ticket with a signed QR code (on screen and by email); staff scan it at the gate. The
design is fixed in code; the admin edits logos, images, text, map location, hero slides, offer banners,
menu labels, footer and SEO from `/admin`. **The design comes from the new UI; the booking functionality comes from
the prototype (`turf.zip`, the old `turf-website` project)**: pitches with default time blocks,
per-date overrides, slot availability, past-slot rules, after-midnight slots and the admin slot editor.
bKash from the prototype was first replaced by SSLCommerz; Step 8a added direct bKash (Tokenized Checkout) back beside it. Sample venue: "TurfZone", Mirpur 12, Dhaka, three
grounds, open 6 am to 3 am, prices in BDT (৳).

## 2. Where things stand

- **Local project:** `D:\projects\turf-cms` (Windows, PowerShell), Next.js 16.4, React 19.3, Tailwind v4, JavaScript.
- **Done:** full UI with sample data (Phase 0), database schema + first migration, Better Auth (email/password + Google),
  login/register/sign-out wired, navbar shows the signed-in user, guards, proxy, seed script.
- **Step 1 (booking, player side) delivered:** real grounds and slots on `/book`, live availability,
  15-minute holds, My bookings from the database, cancel a held booking, admin area protected by role.
- **Step 3 (booking, admin side) delivered:** real overview (stats, today board, latest bookings), grounds list +
  add/edit ground, slot editor (default schedule + per-date custom days), bookings table (search, filters, cancel,
  refund done, walk-in bookings). Admin-only screens hidden from editors.
- **Step 4 (CMS read side) delivered:** the whole public site reads from the database: brand colour, logo, favicon
  and SEO (root layout), menu, top bar, popup, hero slides, offer banners, home sections, footer, contact. Home
  "Grounds open today" shows real free times; the QuickBook shortcut and "Still free today" times preselect a slot on `/book`.
- **Step 2 (SSLCommerz payments) delivered:** Pay on `/book`, My bookings and the failed page opens SSLCommerz
  hosted checkout; callbacks + IPN validate with the Validation API and confirm the booking once; late payments
  revive the hold or become refund due; result pages are real; cron route re-checks lost payments and expires holds.
- **Step 5 (CMS write side) delivered:** Cloudinary uploads (signed, verified), media library, and live editors for
  branding, navigation, hero slides, offer banners, home sections, footer & SEO; ground photos upload too. Saves show
  on the site immediately (`updateTag`).
- **Step 6 part 1 delivered:** coupons work at checkout (Apply box, server re-check, 100% off books for free,
  redemption counted once on payment), and the Coupons, Payments and Users admin pages are real.
- **Step 6 part 2 delivered:** `/profile` (details + password), `/terms` (editable in Admin, Booking terms), Show ticket
  view, loading/error/404 pages, sitemap/robots, start-up env check, lint clean, `DEPLOY.md`.
- **Step 7a delivered (19 Oct):** Brevo email code at registration (Better Auth `emailOTP`), `/verify-email`,
  unverified players can't hold or pay (`needsVerify`), admin sees player name + phone.
- **Step 7b delivered (19 Oct):** signed QR on every confirmed ticket (My bookings card + Show ticket), public
  `/verify/<token>` page with admin-only **Mark as used** check-in, booking receipt email with QR (sent after payment
  or free booking, resend with **Email receipt**), `/api/ticket-qr/[token]` PNG for emails. Migration 0002.
- **Step 7c delivered (22 Oct):** venue map. Admin sets latitude/longitude/zoom/label/address in Branding; the home
  "Find us" section shows a Leaflet/OpenStreetMap map (illustration when empty). Migration 0003.
- **Lint / build (26 Oct):** lint 0 errors, 2 warnings (`no-img-element` on the QR images; intentional); `npm run build`
  passes on the developer's machine with Next 16.4.3.
- **Step 8a delivered (25 Oct):** direct bKash Tokenized Checkout beside SSLCommerz. Players pick "bKash" or
  "Card or other wallet" on /book, My bookings and the retry button; `/api/payment/bkash/callback` executes the payment
  and confirms through the same claim/settle code as SSLCommerz. `payments.gateway` (migration 0004). Sandbox
  click-through still to do on the dev machine.
- **Step 8b delivered (26 Oct):** admin on/off switch per payment method (Admin, Payments, "Payment methods").
  A switched-off method shows "Off right now"; picking or paying with it opens a dialog that names the method that
  is on and pays with it. Stored in `page_sections` key `payments` (no migration). Direct Nagad was **dropped (26 Oct)**: Nagad only accepts whitelisted fixed server IPs and Vercel Static IPs cost $100/month per project. Nagad stays available through SSLCommerz. Don't build it unless asked.
- **Security review (26 Oct):** see the changelog entry. Next.js 16.4.3, open-redirect fix, booking window, phone hooks,
  editor data, resend limit, match-day check-in, bKash slot check, security headers, robots.
- **Next:** small pre-deploy fixes (`DEPLOY.md` for Brevo/`TICKET_SECRET`/`BKASH_*`, "Checked in" column), then deploy.

## 3. Stack in use

| Package | Purpose |
|---|---|
| `next` 16.4.3, `react` 19.3 | App Router, JavaScript only (16.4.3: security patch; never go back to 16.4.0–16.4.2) |
| `tailwindcss` v4, `@tailwindcss/postcss` | Styling |
| `drizzle-orm` 0.45, `drizzle-kit` 0.31, `@neondatabase/serverless` | Database (Neon Postgres) |
| `better-auth` 1.7 | Auth, drizzle adapter, `role` + `phone` additional fields, `emailOTP` plugin |
| `zod` 4 | Validation |
| `framer-motion`, `lucide-react`, `embla-carousel-*`, `clsx`, `tailwind-merge` | UI |
| `qrcode` 1.5 | Server-side QR PNGs for tickets (`src/lib/qrcode.js`) |
| (no package) bKash Tokenized Checkout | Direct bKash payments over REST (`src/lib/bkash.js`) |
| `leaflet` 1.9, `react-leaflet` 5 | Venue map (OpenStreetMap tiles, no API key) |
| `@vercel/functions` | `waitUntil` for receipt emails after the response |
| `dotenv`, `server-only` | Env loading for scripts, server-only guard |

Brevo (email) and Cloudinary (images) are called over REST without SDKs.

Scripts in `package.json`: `dev` (`next dev --webpack`), `db:generate`, `db:migrate`, `db:push`, `db:studio`,
`db:seed` (`node --env-file=.env.local src/db/seed.js`).

Env file: **`.env.local`** for everything (Next.js, drizzle-kit and the seed). Template: `.env.example`.

## 4. Coding conventions (follow exactly)

1. Line 1 of every file is its path as a comment: `// src/features/booking/queries.js`.
2. JavaScript only. `.jsx` for components/pages, `.js` for logic.
3. `"use client"` only where needed. Server-only modules start with `import "server-only"`.
4. Server actions return `{ ok: true, data }` or `{ ok: false, error, needsLogin?, needsVerify? }`. They never throw to the client.
5. Never trust prices, times or IDs from the browser: re-read them on the server (see `resolveBlock`).
6. All "now" logic uses `src/lib/time.js` (Asia/Dhaka). Never `new Date().getHours()` on the server; servers run in UTC.
7. Never use `toLocaleDateString` in components rendered on the server (hydration mismatch). Use `shortDateLabel()`.
8. Components take data as props. Pages/layouts fetch data and pass it down. Keep prop shapes stable.
9. Pages that read the session or live data export `const dynamic = "force-dynamic"`.
10. Any client component that calls `useSearchParams()` must be wrapped in `<Suspense>` by its page, or `next build` fails.
11. Copy: sentence case, buttons say exactly what happens, errors say what to do next.
12. Secrets only via `process.env.X`, listed in `src/lib/env.js`. Never hard-coded.
13. Emails and other slow side effects after a response: `waitUntil(promise.catch(...))` from `@vercel/functions`;
    a failed email must never fail the booking or payment.
14. Browser-only libraries (Leaflet) load through a client wrapper with `next/dynamic(..., { ssr: false })`
    (`VenueMapLoader.jsx`); Next 16 forbids `ssr: false` in server components.

## 5. Booking rules (from the prototype, now in the new code)

- **Blocks:** each pitch has `defaultBlocks` (JSON `[{ startTime, endTime, price, sortOrder }]`). A date with rows in
  `time_blocks` uses those instead (per-date override). Default blocks get ids `default-<index>`; override blocks use their uuid.
- **Day start (per sheet):** a "sheet" is one ground's slots for one date (default schedule, or a custom one for that
  date). Its day starts at its **first slot** (`dayStartOf(blocks)`, minutes), e.g. 05:00, 06:00 or 16:00. A slot starting
  earlier than that (01:30 on a 06:00 sheet) is played after midnight on the next calendar day but stays on that sheet and
  is stored with its `bookingDate`. There is no fixed 6 am any more (`DEFAULT_DAY_START` is only the fallback for an empty sheet).
- **Past slots:** `isBlockPast(date, start, dayStart)` compares the slot's real start (date + time, next day if after
  midnight) with the time in Dhaka. Always pass the sheet's `dayStart`: `resolveBlock()` returns it as `block.dayStart`,
  `getSheetDayStarts([{ pitchId, date }])` gives it for booking rows, and booking views carry `dayStart`.
- **"Today":** `currentVenueDay()` (booking queries). Yesterday stays "today" only while an open ground's sheet for
  yesterday still has after-midnight slots running (`nightEndOf`); a 5 am to 10 pm venue switches at midnight.
- **Parts of the day** (`features/booking/parts.js`): morning < 12:00, afternoon < 17:00, evening < 22:00, late night
  = 22:00+ or after midnight. Used by the slot board, the `?part=` preselect and the home search (which only offers parts
  a ground really has).
- **Slot states:** `booked` (confirmed booking), `held` (held booking whose `holdExpiresAt` is in the future), `past`, `free`.
- **Holds:** "Pay" creates a booking with `status = held`, `holdExpiresAt = now + 15 min`, price from the server.
  Expired holds are marked `expired` lazily (`expireStaleHolds`) before a new hold, and daily by `/api/cron/expire-holds`.
- **No double booking:** partial unique index `bookings_active_slot_uq` on `(pitch_id, booking_date, start_time)`
  where `status in ('held','confirmed')`. A collision returns "Someone just booked this slot."
- **Limits:** max 2 active holds per player. Only held bookings can be cancelled by the player.
- **Statuses:** `held`, `confirmed`, `cancelled`, `expired`, `completed` (shown when a confirmed booking's time has passed).
  `paymentStatus`: `unpaid`, `paid`, `refund_due`, `refunded`.

## 6. Files that matter now

### Database (`src/db/`)
| File | Notes |
|---|---|
| `index.js` | neon-http Drizzle client (`db`) |
| `pool.js` | `getTxDb()` WebSocket Pool for interactive transactions (not used: payments use a conditional-update claim instead) |
| `schema/auth.js` | `user` (with `emailVerified`, `phone`, `role`), `session`, `account`, `verification` (also holds OTP codes) |
| `schema/booking.js` | `pitches`, `time_blocks` |
| `schema/commerce.js` | `coupons`, `bookings` (FKs to pitches/time_blocks, unique active slot index, `checkedInAt`, `checkedInBy` -> user), `coupon_redemptions`, `payments` (`gateway`, `sessionKey` index), `audit_log` |
| `schema/cms.js` | `site_settings` (incl. `mapLat`, `mapLng`, `mapZoom`, `mapLabel`, `mapAddress`), `nav_items`, `hero_slides`, `promo_banners`, `page_sections`, `media` |
| `seed.js` | settings row, nav, sections, hero, banners, coupons, 3 pitches with default blocks, promotes `SEED_ADMIN_EMAIL` to admin (no map coordinates) |

Migrations (`drizzle/`): `0000` initial schema, `0001` booking FKs + `bookings_active_slot_uq`, `0002` `bookings.checked_in_at/by`,
`0003` `site_settings.map_*`, `0004` `payments.gateway` + `payments_session_key_idx`.

### Lib (`src/lib/`)
| File | Exports |
|---|---|
| `auth.js` | Better Auth server instance; `emailOTP` (6 digits, 5 min, 3 attempts, only `email-verification` sends mail); `requireEmailVerification: false`; `databaseHooks.user.create/update.before` validate phone (BD mobile) and trim/cap name; `isGoogleEnabled`. Built-in rate limits in production: sign-in/up 3 per 10 s, OTP sends 3 per min (memory, per instance) |
| `auth-client.js` | `authClient` (with `emailOTPClient`), `signIn`, `signUp`, `signOut`, `useSession` |
| `brevo.js` | `sendBrevoEmail({ to, subject, html, text })`, throws on missing env / non-2xx |
| `ticket-token.js` | `signTicket(bookingId)`, `verifyTicketToken(token)` -> `{ bookingId }` or null (HMAC-SHA256, `TICKET_SECRET` or `BETTER_AUTH_SECRET`, 365 days), `ticketVerifyUrl(bookingId)` |
| `qrcode.js` | Server-only: `qrDataUrlForUrl(url)` -> PNG data URL, 240 px |
| `guards.js` | `getSession()`, `requireUser(next)`, `requireRole(roles)` |
| `action.js` | `action(schema, roles, handler)` wrapper for admin actions |
| `time.js` | `DEFAULT_DAY_START`, `dhakaDate`, `dhakaTime`, `hhmmToMinutes`, `minutesToHHMM`, `addDaysISO`, `dayStartOf(blocks)`, `isAfterMidnight(hhmm, dayStart)`, `operatingMinutes(hhmm, dayStart)`, `playDateOf`, `isBlockPast(date, start, dayStart)`, `nightEndOf(blocks)`, `currentOperatingDay(nightEnd)`, `shortDateLabel`. `DAY_START_HOUR` kept only for old imports |
| `cache-tags.js`, `utils.js` | tags, `cn`/`taka`/`time12` |
| `env.js` | `checkEnv(env)` → `{ errors, warnings }`, `assertEnv()` (throws on a live production server). Called once at start-up from `src/instrumentation.js`. Warns on missing `BREVO_*`, missing/short `TICKET_SECRET`, partial `BKASH_*`, sandbox `SSLCZ_IS_LIVE`/`BKASH_IS_LIVE` on a live server; refuses `*_API_BASE` test vars live |
| `phone.js` | Pure: `BD_PHONE_RE`, `BD_PHONE_HINT`, `normalizeBdPhone`, `cleanBdPhone` (used by auth hooks + profile) |
| `utils.js` (also) | `safeNext(raw)`: same-site path or "/" (every `?next=` redirect) |

### Booking feature (`src/features/booking/`)
| File | What it does |
|---|---|
| `slots.js` | Prototype slot engine (pure): generate/validate/resize/delete blocks, 12h formatting. Used by the admin slot editor in Step 3 |
| `queries.js` | `currentVenueDay`, `getSheetDayStarts`, `defaultSheet`, `getVenueHoursLabel`, `withVenueHours`, `getPitches`, `getPitchById`, `toPitchView`, `getTimeBlocksForPitch`, `resolveBlock` (+ `dayStart`), `getTakenSlots`, `getSlotBoard`, `expireStaleHolds`, `getMyBookings` (adds `ticketToken` + `qrDataUrl` for confirmed, not yet played), `getBookingForUser`, `HOLD_MINUTES` |
| `actions.js` | `previewCoupon({ code, pitchId, blockId, date })`, `createBookingHold({ pitchId, blockId, date, couponCode })` (date must be real and inside the 14-day window; `needsVerify` if email not verified; 0 total → confirmed free, `data.free`, receipt emailed), `cancelHeldBooking(bookingId)` |
| `actions-email.js` | `resendTicketEmail(bookingId)`: own confirmed booking only, max 3 per 15 min (logged in `audit_log` as `receipt_resend`) → `sendBookingReceiptByBookingId` |
| `components/BookingClient.jsx` | Real data: fetches `/api/booked-slots`, loading/error/empty states, reserve, redirects to login with `next`; `emailVerified` prop shows a "Verify your email to book" banner and sends Pay to `/verify-email` |
| `components/BookingSummary.jsx` | `onPay`, `busy`, `error`, `isSignedIn`, `coupon`, `onApplyCoupon`, `onRemoveCoupon`, `showCoupon` (default true), `methods`/`method`/`onMethodChange` (PayMethodPicker); "Book for free" at 0 |
| `components/PitchPicker.jsx` | Falls back to pitch lines when a ground has no photo |
| `components/MyBookingsClient.jsx` | Real bookings, "reserved for you" notice, cancel held, `payMethods` (PayDialog / MethodOffDialog), **Email receipt** (`onEmail`) |
| `components/BookingTicket.jsx` | `onCancel`, `onPay`, `onShow`, `onEmail`, `payHref`, `busy`, `highlight`; 72 px QR on confirmed bookings |
| `components/TicketDialog.jsx` | Full ticket for a confirmed booking (code, ground, date, time, player, payment, 200 px QR "Show this at the gate", Add to calendar). Props `{ booking, onClose, playerName, venue: { name, address } }` |
| `calendar.js` | Pure, for booking views with `dayStart`: `isAfterMidnight(b)`, `playDate(b)`, `calendarUrl(b)` (Google Calendar), `longDateLabel` ("Friday 16 October 2026"); `BOOKING_DAYS_AHEAD` (14), `isRealDate(iso)` |
| `parts.js` | Pure: `PARTS`, `partOf(start, late)`, `partsOf(blocks)` |
| `components/DateStrip.jsx`, `SlotBoard.jsx` | Unchanged UI |

### Auth emails and tickets (`src/features/auth/`, Steps 7a/7b)
| File | What it does |
|---|---|
| `emails.js` | `sendOtpEmail({ email, otp })` (subject "123456 is your TurfZone verification code"; name from optional `APP_NAME`). Throws on failure |
| `ticket-email.js` | `sendTicketEmail({ email, booking, site })` (HTML + text receipt with QR `<img src="APP_URL/api/ticket-qr/<token>">` and verify link), `sendBookingReceiptByBookingId(bookingId)` (loads booking, user email, `dayStart`, site settings). Never throws |
| `components/auth/VerifyEmailForm.jsx` | 6-digit code entry, `authClient.emailOtp.verifyEmail`, "Send a new code" |
| `app/(auth)/verify-email/page.jsx` | `?email=&next=`; form wrapped in Suspense |

Register flow: `signUp.email()` → `authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })` →
`/verify-email?email=&next=`. Login has no OTP; Google accounts arrive verified.

### QR tickets and check-in (Step 7b)
| File | What it does |
|---|---|
| `app/(site)/verify/[token]/page.jsx` | **Public** (not in `proxy.js`), `noindex` + disallowed in robots. Verifies the token, re-reads the booking. States in order: `invalid` (bad token), `not_found`, `cancelled`, `expired`, `unpaid` (held), `refunded`, `played` (start time past), `invalid` (other non-confirmed), else `valid`. `canCheckIn` = signed-in admin + `valid` + booking date is today's venue day + not checked in (`wrongDay` note otherwise) |
| `components/site/VerifyTicket.jsx` | Coloured result card + booking rows (code, ground, date, "Night of", time, player, amount, checked in) + **Mark as used** |
| `features/admin/actions/checkin.js` | `markTicketUsed({ bookingId })`: admin only; only when the booking's date is today's venue day (`currentVenueDay`); `UPDATE ... WHERE status='confirmed' AND checked_in_at IS NULL` sets `checkedInAt`/`checkedInBy`; error if already used; no audit_log |
| `app/api/ticket-qr/[token]/route.js` | GET → PNG of the verify URL (404 for a bad token), `Cache-Control: immutable`. Used by emails |

Rules: the QR only proves we issued it; state is always re-read. A fresh token (new `issuedAt`) is minted on every render,
so the QR image differs between loads; all verify. Receipt email goes out after `settleBooking` confirms a held/expired
booking and after a free booking (both `waitUntil`); not for walk-ins. Already-checked-in tickets show the green card with a
"Checked in" row (no amber state). Not built yet: "Checked in" column/filter in Admin, Bookings.

### Venue map (Step 7c)
| File | What it does |
|---|---|
| `features/cms/actions/settings.js` | `saveBranding` also takes `map: { lat, lng, zoom, label, address }` (empty → null; lat ±90, lng ±180, zoom 2-19 integer, label 40, address 120) |
| `features/cms/queries.js` | `toSettings()` adds `map` = `{ lat, lng, zoom (default 16), label, address }` or `null` when lat/lng are empty |
| `features/cms/admin/BrandingForm.jsx` | "Map location" panel + "Open Google Maps" helper link |
| `components/site/VenueInfo.jsx` | Server; `map` prop → `VenueMapLoader`, else illustrated `MapArt` |
| `components/site/VenueMapLoader.jsx` | Client wrapper, `next/dynamic(() => import("./VenueMap"), { ssr: false })` with a pulse placeholder |
| `components/site/VenueMap.jsx` | react-leaflet `MapContainer` + OSM `TileLayer`, brand-coloured `divIcon` pin (no Leaflet icon files), popup, site-name chip, `Recenter` |

### Payment feature (`src/features/payment/`) and `src/lib/sslcommerz.js`
| File | What it does |
|---|---|
| `lib/sslcommerz.js` | `initSession`, `validateOrder(valId)`, `queryTransaction(tranId)`, `isSslczConfigured()`, `prettyMethod(cardType)` (`"BKASH"` → "bKash"). Sandbox unless `SSLCZ_IS_LIVE=true`. `SSLCZ_API_BASE` is only for tests (local mock) |
| `lib/bkash.js` | Tokenized Checkout v1.2.0-beta: `isBkashConfigured()`, `createPayment({ tranId, amount, payerReference, callbackURL })` → `{ ok, paymentId, url }`, `executePayment(paymentId)`, `queryPayment(paymentId)`. Token cached per instance, re-granted once on 401. Sandbox unless `BKASH_IS_LIVE=true`; `BKASH_API_BASE` only for tests |
| `methods.js` | `GATEWAYS = ["bkash", "sslcommerz"]`, `SWITCHES_KEY = "payments"`; `isGatewayConfigured(g)` / `configuredGateways()` (env keys, sync; used by callbacks, rechecks, cron); `getPaymentSwitches()` (admin switches from `page_sections`, uncached, missing = on); `await getPayMethods()` → configured `[{ id, label, hint, enabled }]`; `getPaymentMethodsAdmin()`; `gatewayName(g)` |
| `service.js` | `startPayment(bookingId, user, method)`, `confirmPayment({ tranId, valId })` (SSLCommerz rows only; idempotent; outcomes confirmed / slot_lost / duplicate / invalid / pending / unknown), `confirmBkashPayment(paymentId)` (execute → query fallback; + `not_paid`), `closeBkashPayment(paymentId, status, raw)`, shared `claimAndSettle` (claim once, confirm, coupon, receipt email), `recheckPayment(tranId)` (per gateway; bKash = query only), `recheckOpenPayments()`, `markPaymentClosed(tranId, status)`, `getPaymentResult(tranId)` (+ `gateway`) |
| `actions.js` | `payForBooking(bookingId, method?)` → `{ ok, data: { url } }` (`needsVerify` if email not verified; refuses an unconfigured method); the client does `window.location.assign(url)` |
| `components/PayMethodPicker.jsx` | `{ methods, value, onChange, compact }`; cards or segmented pills; nothing with one method |
| `components/PayDialog.jsx` | `{ open, onClose, methods, amount, busy, error, onPay(method) }` for held bookings (My bookings, retry); picking an off method swaps to the "off" message in the same dialog |
| `components/MethodOffDialog.jsx` | Default `MethodOffDialog({ open, onClose, off, alternatives, onUse(id), busy, deskPhone })`; also `MethodOffNotice`, `offCopy(off, alternatives)`, `payLabel(m)` |
| `result-page.js` | `loadPaymentResult(page, searchParams)` for the three result pages (re-checks once on success if still initiated) |
| `components/PaymentResult.jsx` | States: success, pending, failed, cancelled, refund, missing. Google Calendar link |
| `components/RetryPayButton.jsx` | "Try payment again" `{ bookingId, methods, amount }`; opens `PayDialog` with 2+ methods |

Routes: `POST /api/payment/sslcommerz/[event]` (success, fail, cancel, ipn), `GET /api/payment/bkash/callback`
(`?paymentID=&status=success|failure|cancel`), `GET /api/cron/expire-holds`
(Bearer `CRON_SECRET`; `vercel.json` runs it daily at 03:00 Dhaka).

Payment rules:
- `tran_id` = `<booking code>-<6 chars>`, one `payments` row per attempt (`initiated` → `paid` | `failed` | `cancelled` | `refund_due` | `refunded`),
  `gateway` = `sslcommerz` | `bkash`. bKash rows: `sessionKey` = `paymentID`, `bankTranId` = `trxID`, `cardType` = `"BKASH"`.
- bKash: paid only after **execute** (or a status query) says `Completed` for the same paymentID, invoice (`tranId`), BDT and amount.
  Rechecks never execute. Callback status in the URL is never trusted for "paid".
- Only the Validation API is trusted (status VALID/VALIDATED, same tran_id, currency BDT, same amount). Callback fields are never trusted.
- Claim = `UPDATE payments SET status='paid' WHERE status <> 'paid' RETURNING`; only the winner touches the booking.
- Booking held or expired → confirmed (the unique slot index decides if an expired one can be revived).
  Slot gone / booking cancelled → booking cancelled + `refund_due`. Booking already paid → this payment `refund_due`.
- Starting a payment stretches the hold to 15 min from now, never past 30 min after the hold was created.
- Fail/cancel keep the booking held so the player can retry. Admin refunds are still manual (`markRefunded`); the SSLCommerz refund API needs the server IP whitelisted (Step 6).

### CMS feature (`src/features/cms/`)
| File | What it does |
|---|---|
| `queries.js` | Cached reads (`unstable_cache`, tags from `cache-tags.js`, 5 min safety revalidate): `getSiteSettings` (normalised, every field present), `getNavItems`, `getHeroSlides` (active + inside schedule), `getPromoBanners` (one live banner per placement; `code` only if the linked coupon is live; `endsAt` is a label "Ends 31 Oct"), `getSections` (`{ live_grounds, how_it_works, visit }` with `isVisible`), `getSiteChrome`, `brandInk(hex)`. Every getter falls back to defaults if the DB fails |

Booking query added in Step 4: `getGroundsToday()` → `{ date, pitches: [...pitch, freeToday: ["19:30"]], freeCount }`.
`src/lib/utils.js` `canOptimize(src)`: pass `unoptimized={!canOptimize(url)}` to every `next/image` whose URL the admin can type.

### CMS write side (Step 5)
| File | What it does |
|---|---|
| `lib/cloudinary.js` | No SDK, env `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` (folder optional): `isCloudinaryConfigured`, `createUploadSignature(folder)`, `verifyUploadResult(result)` (SHA-1/SHA-256 response signature + our cloud's URL), `destroyImage(publicId)` |
| `features/cms/server-utils.js` | `requireRoles`, `ADMIN_ONLY`, `CONTENT_ROLES`, `DENIED`, `firstIssue`, Zod pieces (`text`, `requiredText`, `link`, `image`, `hexColor`, `isoDate`), `dhakaDayStart/End` |
| `features/cms/admin-queries.js` | Uncached admin reads: `getBrandingAdmin`, `getNavAdmin`, `getFooterSeoAdmin`, `getHeroAdmin`, `getBannersAdmin`, `getSectionsAdmin`, `getMediaAdmin`, `getMediaPickerItems`, `getMediaUsage`, `scheduleStatus` |
| `features/cms/actions/settings.js` | `saveBranding` (admin, incl. map), `saveMenu` (admin), `saveFooterSeo`, `saveSliderSettings` |
| `features/cms/actions/hero.js`, `banners.js`, `sections.js` | Save/toggle/delete/move slides and banners; save all home sections |
| `features/cms/actions/media.js` | `getUploadSignature`, `saveMedia`, `listMediaForPicker`, `updateMediaAlt`, `deleteMedia` (refuses while used) |
| `features/cms/upload-client.js` | Browser: `uploadImage(file, folder, onProgress)` (10 MB, image types) |
| `components/admin/ImageUploader.jsx` | Controlled `{ value, onChange, folder, ratio, hint, fit, dark }`; upload, replace, remove, pick from library |
| `components/admin/MediaPicker.jsx`, `Toast.jsx` | Library picker dialog; `useToast()` |
| `features/cms/admin/*.jsx` | Eight editors (incl. `TermsEditor`), each takes `initial` from its admin query; SaveBar only when dirty |
| Booking terms | `page_sections` row `terms` (`{ heading, intro, items: [{ title, body }] }`, no migration). `getTerms()` / `toTerms()` / `DEFAULT_TERMS` in `cms/queries.js`, `getTermsAdmin()`, `saveTerms()` in `actions/sections.js` (tag `sections`) |

### Profile (`src/features/profile/`)
| File | What it does |
|---|---|
| `actions.js` | `updateProfile({ name, phone })` (phone normalised to `01XXXXXXXXX`, empty allowed) |
| `components/ProfileClient.jsx` | Details form, booking counts, change password (`authClient.changePassword`, signs out other devices), sign out |

### Coupons feature (`src/features/coupons/`)
| File | What it does |
|---|---|
| `rules.js` | Pure: `normalizeCode`, `evaluateCoupon(coupon, ctx)` → `{ ok, discount, total }` or `{ ok:false, error }`, `discountLabel`, `timeWindowLabel`, `isHHMM` |
| `service.js` | Server: `getCouponByCode`, `couponUses(coupon, userId)` (redemptions + active holds), `checkCouponForSlot`, `redeemCoupon(bookingId)` (once per booking, atomic via unique index + `onConflictDoNothing`) |

### Admin feature (`src/features/admin/`)
| File | What it does |
|---|---|
| `queries.js` | `countActiveHolds`, `getDashboardStats`, `getTodayBoard`, `getLatestBookings`, `getLiveContentSummary`, `getAdminBookings({ q, pitchId, status, range, page })`, `getAllPitchesAdmin`, `getPitchAdmin`, `getPitchEditorData(pitchId)` (default + next 30 days). `EDITOR_DAYS = 30`, `PAGE_SIZE = 25` |
| `actions/pitches.js` | Admin only: `upsertPitch`, `togglePitchActive`, `replaceDefaultBlocks`, `replaceDateBlocks`, `resetDateToDefault`, `regenerateDefaultBlocks`, `seedDateFromDefault` |
| `actions/bookings.js` | Admin only: `adminCancelBooking({ bookingId, reason })` (paid becomes `refund_due`), `markRefunded` (also marks its payments refunded), `createWalkInBooking` (confirmed, `source = walk_in`, BD phone check) |
| `commerce-queries.js` | `couponStatus`, `getCouponsAdmin()`, `getPaymentsAdmin({ q, status, page })` (`PAYMENTS_PAGE_SIZE = 25`), `getUsersAdmin({ q })` |
| `actions/coupons.js` | Admin only: `saveCoupon`, `setCouponActive`, `deleteCoupon` (refused once used); all `updateTag(TAGS.banners)` |
| `actions/payments.js` | Admin only: `setPaymentMethodEnabled({ gateway, enabled })` (refuses on without keys), `adminRecheckPayment(tranId)` → `{ outcome, message }` (asks the row's own gateway), `markPaymentRefunded(paymentId)` |
| `components/PaymentMethodsPanel.jsx` | Payment methods card on Admin, Payments: On / Off / Keys not set + switch per gateway, all-off warning |
| `actions/users.js` | Admin only: `setUserRole({ userId, role })`, role `admin | editor | user` (not yourself, not the last admin) |
| `actions/checkin.js` | Admin only: `markTicketUsed({ bookingId })` (see Step 7b above) |
| `components/CouponsManager.jsx` | Codes table (switch, usage, discount given, status) + editor panel (limits, dates, grounds, days, hours) |
| `components/PaymentsTable.jsx` | URL tabs + search, refund/risky alerts, gateway per row, Check with bKash / SSLCommerz (`readyGateways`), Mark refunded, pagination |
| `components/UsersTable.jsx` | Search, role select Admin / Editor / Player (locked for yourself and the last admin) |
| `components/GroundsList.jsx` | Ground cards, open switch, Edit (PitchForm), Edit slots link, empty state |
| `components/PitchForm.jsx` | Add/edit ground dialog (`EMPTY_PITCH`); photo via ImageUploader (folder `pitches`) |
| `components/SlotEditor.jsx` | Tabs: Default schedule + 30 days; price, ±15/30 min, delete, add; custom day / reset / rebuild; sticky save bar |
| `components/BookingsTable.jsx` | URL-driven range tabs + filters (search: name, phone, email, booking ID), player name + phone, cancel dialog, mark refunded, pagination. No check-in column yet |
| `components/WalkInDialog.jsx` | Walk-in/phone booking form; slots from `/api/booked-slots` |

Shared: `src/components/ui/Dialog.jsx` (modal), `src/components/admin/TonightBoard.jsx` (props `{ rows, from, to, now }`),
`src/components/admin/AdminShell.jsx` (`adminOnly` nav items, held-bookings badge from `counts.held`).

### Routes
| Route | Status |
|---|---|
| `/` | **Live** (CMS + live free slots) |
| `/book` | **Live** (`?pitch=&date=&t=HH:MM&part=morning|day|evening|late`) |
| `/bookings` | **Live**, requires sign-in; Show ticket opens `TicketDialog` |
| `/profile` | **Live**, requires sign-in |
| `/terms` | **Live** (content from Admin, Booking terms; defaults until saved) |
| `/sitemap.xml`, `/robots.txt` | From `APP_URL` |
| `/payment/success|failed|cancelled` | **Live** (`?tran=`), no sign-in needed (shows no personal data) |
| `/verify/[token]` | **Live**, public. QR ticket check; admins also get **Mark as used** |
| `/login`, `/register` | **Live** (Better Auth, logo + side photo from CMS), forms wrapped in Suspense |
| `/verify-email` | **Live** (`?email=&next=`), 6-digit code from Brevo |
| `/admin` | **Live** overview (editors see only "Live on the website"; numbers, today board and bookings are admin only) |
| `/admin/pitches`, `/admin/pitches/[id]` | **Live**, admin only |
| `/admin/bookings` | **Live**, admin only (`?range=today|upcoming|week|all&q=&pitch=&status=&page=&walkin=1`) |
| `/admin/{branding,navigation}` | **Live**, admin only |
| `/admin/{hero,banners,sections,footer,media,terms}` | **Live**, admin or editor |
| `/admin/coupons` | **Live**, admin only |
| `/admin/payments` | **Live**, admin only (`?status=paid|started|failed|refund_due|refunded|risky&q=&page=`) |
| `/admin/users` | **Live**, admin only (`?q=`) |
| `/api/auth/[...all]` | Better Auth handler |
| `/api/booked-slots` | **Live** slot board JSON |
| `/api/ticket-qr/[token]` | **Live** QR PNG for emails |
| `/api/payment/sslcommerz/[event]` | **Live** SSLCommerz callbacks + IPN (POST) |
| `/api/payment/bkash/callback` | **Live** bKash browser callback (GET) |
| `/api/cron/expire-holds` | **Live** (Bearer `CRON_SECRET`) |

## 7. Review notes (12 Oct 2026)

Fixed in Step 1:
- Auth route was at `src/app/api/[...all]/route.js` (catch-all for every `/api/*` path). Moved to `src/app/api/auth/[...all]/route.js`.
- `bookings` had no foreign keys and **no double-booking protection**. Added FKs and the partial unique index.
- `next build` failed: `useSearchParams()` in the auth forms without Suspense. Wrapped in the login/register pages.
- `drizzle.config.js` read `.env` while the seed read `.env.local`. Both now use `.env.local`.
- Admin layout used sample data and no role check. Now `requireRole`.
- Prototype bug not carried over: it checked "past slots" with the server's local clock (UTC on hosting). Now Asia/Dhaka.

Still open:
- `.gitignore` already has `!.env.example` (fixed).
- The FIRST200 popup is seeded switched off; switch it on in Offer banners now that coupons work.

## 7b. Review notes (25 Oct 2026, after Steps 7a to 7c)

- Earlier notes said Step 7a removed the editor role. It didn't: `editor` is still accepted by the admin layout, the
  content pages, `CONTENT_ROLES`, `setUserRole` and the Users dropdown. Docs now match the code.
- `/verify/[token]` is public (the original plan had it admin-only). Anyone holding the QR sees player name, ground, time
  and amount. Check-in itself is admin only. Confirm with the client.
- `robots.js` doesn't disallow `/verify` or `/verify-email`.
- `DEPLOY.md` predates 7a/7b: no `BREVO_*` / `TICKET_SECRET` in its env table or checks.
- `/verify` shows 24-hour times (not `time12()`), and `VerifyTicket` copy hard-codes "TurfZone".
- `markTicketUsed` writes no `audit_log` row; `getAdminBookings` doesn't read `checkedInAt`.

## 8. Step plan

- [x] **Step 0. UI, schema, auth** (done before 12 Oct)
- [x] **Step 1. Booking, player side** (12 Oct): schema fix + migration, time helpers, slot engine port, booking queries/actions, `/api/booked-slots`, `/book`, `/bookings`, admin guard, build fix.
- [x] **Step 2. SSLCommerz payments** (13 Oct): `lib/sslcommerz.js`, `features/payment/*`, one dynamic callback route `api/payment/sslcommerz/[event]` (success, fail, cancel, ipn), cron route + `vercel.json`, real result pages, Pay buttons live when the store is configured. See "Payment rules" in section 6.
- [x] **Step 3. Admin bookings side** (13 Oct): port prototype `admin.js`, `PitchesManager`, `SlotEditor` into `/admin/pitches` (ground editor, default blocks, per-date overrides); real `/admin/bookings` (filters, cancel, walk-in); real overview stats + `TonightBoard`.
- [x] **Step 4. CMS read side** (13 Oct): `features/cms/queries.js` (settings, nav, hero, banners, sections) with cache tags; replace sample data in `(site)` layout/home; `--brand` + metadata from settings; `LiveGrounds` with real pitches + free slots tonight.
- [x] **Step 5. CMS write side** (14 Oct): Cloudinary signed upload (no SDK) with verified results, media library + picker, server actions + live editors for branding, navigation, hero, banners, sections, footer/SEO, ground photos; up/down ordering; toasts; hero "shade" setting honoured on the site.
- [x] **Step 6 part 1** (15 Oct): coupons at checkout (preview, re-check on hold, free bookings, redemption on confirm), Coupons/Payments/Users admin pages, sample-data files deleted.
- [x] **Step 6 part 2** (15 Oct): `/profile`, `/terms` + terms editor, Show ticket, loading/error/not-found/global-error, sitemap/robots, env check at start-up, all lint errors fixed, `DEPLOY.md`.
- [x] **Step 7a** (19 Oct): Brevo email OTP at registration (`lib/brevo.js`, `features/auth/emails.js`, `emailOTP` plugin,
  `/verify-email`), booking and paying blocked until verified, admin sees player name + phone.
- [x] **Step 7b** (19 Oct): `lib/ticket-token.js`, `lib/qrcode.js`, QR on tickets, public `/verify/[token]`, admin check-in
  (`actions/checkin.js`, migration 0002), receipt email (`features/auth/ticket-email.js`, auto + resend), `/api/ticket-qr/[token]`.
- [x] **Step 7c** (22 Oct): venue map (migration 0003, Branding map panel, Leaflet `VenueMap` + `VenueMapLoader`).
- [x] **Step 8a** (25 Oct): direct bKash Tokenized Checkout (`lib/bkash.js`, `payment/methods.js`, bKash callback route,
  `PayMethodPicker`, `PayDialog`, gateway-aware service/recheck/cron/admin, `payments.gateway` migration 0004, `BKASH_*` env).
- [x] **Step 8b** (26 Oct): admin on/off switch per payment method (`PaymentMethodsPanel`, `setPaymentMethodEnabled`,
  `page_sections` "payments"), "Off right now" in the picker, `MethodOffDialog`, `methodOff` answer from `payForBooking`.
- [-] Direct Nagad: dropped (whitelisted fixed IP needed; Vercel Static IPs $100/month). Nagad stays inside SSLCommerz.
- [x] **Security review** (26 Oct): Next 16.4.3, zod 4.6.7, `safeNext`, booking window, phone/name hooks, editor overview,
  resend limit, match-day check-in, bKash slot check before execute, security headers, robots/noindex for verify pages.
- [ ] **Confirm on the dev machine**: `payments.gateway` column exists; sandbox payment with bKash and SSLCommerz; method
  switches; sign-up phone check; `?next=` redirect stays on site.
- [ ] **Pre-deploy fixes**: update `DEPLOY.md` (Brevo, `TICKET_SECRET`, `BKASH_*`, QR/receipt checks); "Checked in" column
  + filter in Admin, Bookings; optional `time12()` + site name on `/verify`.
- [ ] **Deploy**: follow `DEPLOY.md` (Vercel, live Neon branch, `db:migrate` 0000 to 0004, domain, Google OAuth, live SSLCommerz + IPN, external 15-min cron).
- [ ] Optional later: write admin actions (incl. check-in) to `audit_log`, SMS confirmations, SSLCommerz refund API (needs a fixed IP), remove `editor` if unused.

## 9. Gotchas

| Problem | Fix |
|---|---|
| Turbopack crashes in dev | `npm run dev` already uses `--webpack` |
| `useSearchParams() should be wrapped in a suspense boundary` on build | Wrap that client component in `<Suspense>` in its page |
| Migration says relation exists | You ran `db:push` before; use either push or generate+migrate, not both, on the same database |
| Unique index migration fails | Existing duplicate active bookings for the same slot; cancel duplicates in `db:studio`, then migrate again |
| Hydration error on dates | Use `shortDateLabel()` / fixed arrays, not locale APIs |
| A slot that already started is still bookable | The past check didn't get the sheet's `dayStart`; pass `block.dayStart` / `getSheetDayStarts` |
| Footer shows old opening hours | Clear "Opening hours" in Footer & SEO: empty = automatic from the grounds (`withVenueHours`) |
| Editor can't see Grounds/Bookings | By design: those are `adminOnly`; set `role = admin` in `db:studio` |
| Admin edit doesn't show on the site | The save action must call `updateTag(TAGS.x)` (server actions) for the tag the public read uses |
| Upload: "isn't set up" / "couldn't be verified" | Cloudinary keys missing, or the secret doesn't match the cloud name and key |
| `next/image` error "hostname is not configured" | Use `unoptimized={!canOptimize(src)}`, or add the host to `next.config.mjs` |
| Pay button missing | No gateway configured: neither `SSLCZ_STORE_ID`/`SSLCZ_STORE_PASSWORD` nor all four `BKASH_*` set (restart dev after editing) |
| "X is off right now" for players | The admin switched that method off in Admin, Payments, Payment methods |
| `npm ci` says lock file out of sync | `package.json` and `package-lock.json` must be replaced together (or run `npm install`) |
| Sign-up refused with the phone message | The phone isn't a Bangladeshi mobile (`01XXXXXXXXX`); checked server-side by the auth hook |
| "You can book up to 14 days ahead" | The date is outside `BOOKING_DAYS_AHEAD` or not a real date (server check) |
| Verify page: no Mark as used, "not today" note | Check-in only works on the booking's match day |
| "We've already sent this receipt 3 times" | Resend limit (3 per 15 min per booking, `audit_log`) |
| IPN never arrives locally | Expected: SSLCommerz can't reach localhost. The browser success callback confirms instead; IPN works once deployed |
| Vercel deploy fails on cron schedule | Hobby plan allows daily crons only; keep `vercel.json` daily or use an external cron with the Bearer header |
| Stale styles | Delete `.next`, restart dev |
| `[env]` lines in the terminal at start-up | `src/lib/env.js` lists missing/placeholder variables (names only). Errors stop a live production server |
| Lint error `react-hooks/set-state-in-effect` | Don't reset state in an effect when a prop changes; compare with the previous value during render (`const [last, setLast] = useState(x); if (x !== last) {...}`) or key the loaded data (see `BookingClient` board) |
| Coupon "used up" with no paid uses | Active holds count as uses for 15 min |
| Coupon can't be deleted | It has redemptions; switch it off instead |
| `column "checked_in_at"` / `"map_lat" does not exist` | Run `npm run db:migrate` (0002, 0003) |
| Registration code never arrives | `BREVO_*` missing, sender not verified in Brevo, or spam folder. `/verify-email` has "Send a new code" |
| Can't book: "Verify your email" | Expected for unverified accounts; finish `/verify-email` |
| No receipt email after paying | Logs: `[ticket-email:after-pay]`; player can press **Email receipt** in My bookings |
| QR in the email is broken | `APP_URL` must be the public address (mail clients fetch `/api/ticket-qr/...`) |
| QR shows "Not a TurfZone ticket" | `TICKET_SECRET` changed, token over 365 days old, or tampered |
| No "Mark as used" on the verify page | Not signed in as admin on that phone, ticket not valid, or already checked in |
| `window is not defined` (Leaflet) | Only import `VenueMap` through `VenueMapLoader` |
| Map shows the illustration | Latitude/longitude empty in Admin, Branding, Map location |
| Lint warns `no-img-element` on QR images | Intentional (data URLs); 0 errors is the bar |
| "Pay with bKash" missing | All four `BKASH_*` keys needed; restart dev after editing `.env.local` |
| bKash payment ends on "didn't go through" | Logs `[bkash:not_paid]` show bKash's code (PIN/OTP, test wallet balance, timeout); slot stays held |
| `[bkash:grant]` in logs | Wrong bKash keys, or sandbox keys with `BKASH_IS_LIVE=true` |
| `column "gateway" does not exist` | `npm run db:generate` then `npm run db:migrate` (0004) |

## 10. Changelog
- 2026-10-11: Blueprint agreed. Phase 0 UI built (73 files). Project set up in `D:\projects\turf-cms`.
- Before 2026-10-12: schema split into auth/booking/cms/commerce, first migration, seed, Better Auth, auth forms, navbar session, guards, proxy, env, action wrapper.
- 2026-10-12: Review + Step 1 (booking, player side). Fixed auth route location, bookings FKs + double-booking index, build failure on /login, env file mismatch, admin guard.
- 2026-10-13: Step 3 (booking, admin side). Admin queries/actions, grounds + slot editor, bookings table + walk-ins, real overview, Dialog component, admin-only nav. Fixed operating day to a fixed 6 am start (`DAY_START_HOUR`).
- 2026-10-13: Step 4 (CMS read side). `features/cms/queries.js`, root layout reads brand/SEO, site layout/home/book/auth pages read the CMS, live "free today", working QuickBook + slot preselect, seed adds hero slides, banners and coupons. Root layout is `force-dynamic`, so builds no longer need the database.
- 2026-10-13: Step 2 (SSLCommerz). lib/sslcommerz, payment service/actions, callback + IPN route, real result pages, Pay on /book + My bookings, cron route + vercel.json. 38 payment tests (race, forged val_id, amount mismatch, duplicate, slot lost, lost callback, gateway down) + browser e2e against a mock gateway.
- 2026-10-14: Step 5 (CMS write side). lib/cloudinary, cms actions + admin queries, 7 live editors, ImageUploader/MediaPicker/Toast, ground photo upload, admin-only page guards on coupons/payments/users, admin sidebar shows the site name. 58 CMS tests + browser e2e (production build, mock Cloudinary).

- 2026-10-15: Step 6 part 1. `features/coupons/*`, coupon box on /book (preview, re-check on hold, 100% off = free booking), redemption on payment confirm, admin commerce queries + coupons/payments/users actions, real Coupons/Payments/Users pages, sample-data files deleted. 52 integration tests + browser e2e (production build, mock gateway).

- 2026-10-15: Step 6 part 2. Profile page + `updateProfile`, booking terms page + editor (stored in `page_sections`), TicketDialog + shared `booking/calendar.js`, loading/error/not-found/global-error, sitemap/robots, `lib/env.js` rewritten + `src/instrumentation.js`, 12 lint errors fixed (state-sync effects replaced), `DEPLOY.md`. Browser e2e on a production build.

- 2026-10-15: Cloudinary needs only `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (folder optional, default `turfzone`; old `NEXT_PUBLIC_` name still accepted; pasted spaces/quotes trimmed).

- 2026-10-15: Hours fully dynamic. Each sheet's day starts at its first slot (no fixed 6 am): past slots, after-midnight dates, "today" (`currentVenueDay`), ticket/calendar dates, coupon hour windows, admin today board, slot board groups, home search parts and the footer hours (automatic when left empty) all follow the grounds' real slots. Editing a ground's hours or slot length rebuilds its default slots.

- 2026-10-19: Step 7a. Better Auth `emailOTP` + Brevo (`lib/brevo.js`, `features/auth/emails.js`), `VerifyEmailForm` + `/verify-email`, register flow sends the code, `createBookingHold` / `payForBooking` return `needsVerify`, verify banner on `/book`, Brevo warnings in `lib/env.js`.

- 2026-10-19: Step 7b. `lib/ticket-token.js` (HMAC tokens), `lib/qrcode.js` (`qrcode` package), QR on `BookingTicket` + `TicketDialog`, public `/verify/[token]` + `VerifyTicket`, `markTicketUsed` (migration 0002 `checked_in_at/by`), receipt email `features/auth/ticket-email.js` sent via `waitUntil` (`@vercel/functions`) after payment and free bookings, **Email receipt** button (`booking/actions-email.js`), `/api/ticket-qr/[token]`, `TICKET_SECRET` in `.env.example` + env check.

- 2026-10-22: Step 7c. Venue map: `site_settings.map_*` (migration 0003), Branding "Map location", `toSettings().map`, `VenueMap` (react-leaflet, OSM) via `VenueMapLoader` (`ssr: false`), `VenueInfo` falls back to the illustration.

- 2026-10-25: Docs refreshed to match the code (`Agents.md`, `CLAUDE.md`, `ai-context.md`). Corrected: editor role still exists, `/verify` is public. Lint: 0 errors, 2 img warnings. Open: `DEPLOY.md` env table, robots, checked-in column.

- 2026-10-25: Step 8a. Direct bKash Tokenized Checkout beside SSLCommerz: `lib/bkash.js`, `payment/methods.js`,
  `api/payment/bkash/callback`, `confirmBkashPayment` (execute → query, shared `claimAndSettle`), per-gateway recheck in
  cron/admin/success page, `PayMethodPicker` + `PayDialog` on /book, My bookings and retry, admin Payments shows the gateway,
  `payments.gateway` + `payments_session_key_idx` (migration 0004), `BKASH_*` in `.env.example` and the env check.
  Lint 0 errors; build compiles; bKash client tested against a mock (grant, 401 re-grant, create, execute 2117 → query).

- 2026-10-26: Step 8b. Payment method switches: `methods.js` splits configured (env) from enabled (admin switch in
  `page_sections` key `payments`), `getPayMethods()` is async and returns `enabled`, `setPaymentMethodEnabled`,
  `PaymentMethodsPanel` on Admin, Payments, `MethodOffDialog` + "Off right now" in `PayMethodPicker`, `PayDialog` off view,
  `payForBooking` returns `methodOff` with the methods that are on; /book checks before reserving. Rechecks/cron ignore the
  switch. Direct Nagad dropped. Lint 0 errors; build compiles.

- 2026-10-26: Developer applied everything: `npm ci` (next 16.4.3, zod 4.6.7), migration `0004_next_fabian_cortez`
  generated + migrated, `npm run build` passes on Windows. Still to confirm: the `payments.gateway` column exists
  (migrate printed no success line) and a real sandbox payment with bKash and SSLCommerz.

- 2026-10-26: Security review + fixes. Next.js 16.4.0 → **16.4.3** (critical advisories: image-optimizer SVG RCE,
  server-action DoS), zod → 4.6.7 (+ `overrides` for `@vercel/cli-config`). Open redirect via `?next=` fixed (`safeNext`
  in `lib/utils.js`, used by login/register/verify-email/Google). Booking date must be a real day inside the 14-day
  window (`BOOKING_DAYS_AHEAD`, `isRealDate` in `booking/calendar.js`; checked in `createBookingHold`/`previewCoupon`).
  Phone/name validated server-side for sign-up and Better Auth update-user (`databaseHooks` in `lib/auth.js`,
  `lib/phone.js`). Editors no longer see revenue/bookings on the overview. Receipt resend limited to 3 per 15 min
  (`audit_log` action `receipt_resend`). Check-in only on match day (`markTicketUsed` + verify page note). bKash is not
  executed when the slot is gone (no charge, no manual refund). Security headers in `next.config.mjs`;
  `/verify/` + `/verify-email` disallowed in robots, verify page `noindex`. CMS link check rejects `/\\host`.
  Remaining audit: 4 moderate in drizzle-kit's esbuild (dev only).

- 2026-10-26: Payment robustness (from an external review). `claimAndSettle` follow-ups: a payment already marked paid
  whose booking is still unpaid (crash between the two writes) is settled by `ensureSettled` on the next callback /
  recheck (after 2 min) and by `repairUnsettledPayments()` in the cron job (runs before holds expire);
  `duplicateOrConfirmed` decides refund_due only when another paid payment exists for the booking. `redeemCoupon`
  is atomic: unique index `redemptions_booking_uq` on `coupon_redemptions.booking_id` + `onConflictDoNothing`, and
  `usedCount` only bumps for the winning insert (migration generated on the dev machine).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->