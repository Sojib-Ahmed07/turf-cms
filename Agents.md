# AGENTS.md — TurfZone CMS, current progress

Read this file first in every new chat. It records what exists in the codebase right now, how it is
written, and what to do next. The complete end-state plan (database, payments, every action, all
phases) is in `BLUEPRINT.md`; read the relevant section before building a feature.

At the end of every session, update section 8 (Step plan) and section 10 (Changelog).

## 1. Project in one paragraph

TurfZone CMS is a turf-booking website for one venue in Bangladesh, built for a client.
Players pick a ground, date and time block, pay through SSLCommerz, and get a booking ticket. The
design is fixed in code; the admin edits logos, images, text, hero slides, offer banners, menu labels,
footer and SEO from `/admin`. **The design comes from the new UI; the booking functionality comes from
the prototype (`turf.zip`, the old `turf-website` project)**: pitches with default time blocks,
per-date overrides, slot availability, past-slot rules, after-midnight slots and the admin slot editor.
bKash from the prototype is replaced by SSLCommerz. Sample venue: "TurfZone", Mirpur 12, Dhaka, three
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
- **Next:** deploy (follow `DEPLOY.md`). Optional later: audit log, email confirmations.

## 3. Stack in use

| Package | Purpose |
|---|---|
| `next` 16.4, `react` 19.3 | App Router, JavaScript only |
| `tailwindcss` v4, `@tailwindcss/postcss` | Styling |
| `drizzle-orm` 0.45, `drizzle-kit` 0.31, `@neondatabase/serverless` | Database (Neon Postgres) |
| `better-auth` 1.7 | Auth, drizzle adapter, `role` + `phone` additional fields |
| `zod` 4 | Validation |
| `framer-motion`, `lucide-react`, `embla-carousel-*`, `clsx`, `tailwind-merge` | UI |
| `dotenv`, `server-only` | Env loading for scripts, server-only guard |

Scripts in `package.json`: `dev` (`next dev --webpack`), `db:generate`, `db:migrate`, `db:push`, `db:studio`,
`db:seed` (`node --env-file=.env.local src/db/seed.js`).

Env file: **`.env.local`** for everything (Next.js, drizzle-kit and the seed). Template: `.env.example`.

## 4. Coding conventions (follow exactly)

1. Line 1 of every file is its path as a comment: `// src/features/booking/queries.js`.
2. JavaScript only. `.jsx` for components/pages, `.js` for logic.
3. `"use client"` only where needed. Server-only modules start with `import "server-only"`.
4. Server actions return `{ ok: true, data }` or `{ ok: false, error, needsLogin? }`. They never throw to the client.
5. Never trust prices, times or IDs from the browser: re-read them on the server (see `resolveBlock`).
6. All "now" logic uses `src/lib/time.js` (Asia/Dhaka). Never `new Date().getHours()` on the server; servers run in UTC.
7. Never use `toLocaleDateString` in components rendered on the server (hydration mismatch). Use `shortDateLabel()`.
8. Components take data as props. Pages/layouts fetch data and pass it down. Keep prop shapes stable.
9. Pages that read the session or live data export `const dynamic = "force-dynamic"`.
10. Any client component that calls `useSearchParams()` must be wrapped in `<Suspense>` by its page, or `next build` fails.
11. Copy: sentence case, buttons say exactly what happens, errors say what to do next.

## 5. Booking rules (from the prototype, now in the new code)

- **Blocks:** each pitch has `defaultBlocks` (JSON `[{ startTime, endTime, price, sortOrder }]`). A date with rows in
  `time_blocks` uses those instead (per-date override). Default blocks get ids `default-<index>`; override blocks use their uuid.
- **Operating day:** every day starts at the fixed `DAY_START_HOUR = 6` (in `time.js`) for **every ground**, whatever its
  opening hours, and runs past midnight. Slots starting before 6:00 belong to the previous day's sheet and are stored with
  that sheet's `bookingDate`. `currentOperatingDay()` treats 00:00–05:59 as "yesterday". Never pass a ground's `openHour`
  to the time helpers: a ground opening at 4 pm would shift "today" back a day (bug found and fixed in Step 3).
- **Past slots:** a block is past once its start time has passed on the current operating day (`isBlockPast`).
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
| `schema/auth.js` | `user` (with `phone`, `role`), `session`, `account`, `verification` |
| `schema/booking.js` | `pitches`, `time_blocks` |
| `schema/commerce.js` | `coupons`, `bookings` (FKs to pitches/time_blocks, unique active slot index), `coupon_redemptions`, `payments`, `audit_log` |
| `schema/cms.js` | `site_settings`, `nav_items`, `hero_slides`, `promo_banners`, `page_sections`, `media` |
| `seed.js` | settings row, nav, sections, 3 pitches with default blocks, promotes `SEED_ADMIN_EMAIL` to admin |

### Lib (`src/lib/`)
| File | Exports |
|---|---|
| `auth.js` | Better Auth server instance |
| `auth-client.js` | `signIn`, `signUp`, `signOut`, `useSession` |
| `guards.js` | `getSession()`, `requireUser(next)`, `requireRole(roles)` |
| `action.js` | `action(schema, roles, handler)` wrapper for admin actions |
| `time.js` | `DAY_START_HOUR`, `dhakaDate`, `dhakaTime`, `hhmmToMinutes`, `minutesToHHMM`, `addDaysISO`, `operatingMinutes`, `currentOperatingDay`, `isBlockPast`, `operatingDay`, `shortDateLabel` |
| `cache-tags.js`, `utils.js` | tags, `cn`/`taka`/`time12` |
| `env.js` | `checkEnv(env)` → `{ errors, warnings }`, `assertEnv()` (throws on a live production server). Called once at start-up from `src/instrumentation.js` |

### Booking feature (`src/features/booking/`)
| File | What it does |
|---|---|
| `slots.js` | Prototype slot engine (pure): generate/validate/resize/delete blocks, 12h formatting. Used by the admin slot editor in Step 3 |
| `queries.js` | `getPitches`, `getPitchById`, `toPitchView`, `getTimeBlocksForPitch`, `resolveBlock`, `getTakenSlots`, `getSlotBoard`, `expireStaleHolds`, `getMyBookings`, `getBookingForUser`, `HOLD_MINUTES` |
| `actions.js` | `previewCoupon({ code, pitchId, blockId, date })`, `createBookingHold({ pitchId, blockId, date, couponCode })` (0 total → confirmed free, `data.free`), `cancelHeldBooking(bookingId)` |
| `components/BookingClient.jsx` | Real data: fetches `/api/booked-slots`, loading/error/empty states, reserve, redirects to login with `next` |
| `components/BookingSummary.jsx` | `onPay`, `busy`, `error`, `isSignedIn`, `coupon`, `onApplyCoupon`, `onRemoveCoupon`, `showCoupon` (default true); "Book for free" at 0 |
| `components/PitchPicker.jsx` | Falls back to pitch lines when a ground has no photo |
| `components/MyBookingsClient.jsx` | Real bookings, "reserved for you" notice, cancel held, `paymentsLive` flag |
| `components/BookingTicket.jsx` | `onCancel`, `onPay`, `onShow`, `payHref`, `busy`, `highlight` |
| `components/TicketDialog.jsx` | Full ticket for a confirmed booking (code, ground, date, time, player, payment, Add to calendar). Props `{ booking, onClose, playerName, venue: { name, address } }` |
| `calendar.js` | Pure: `isAfterMidnight`, `playDate`, `calendarUrl` (Google Calendar), `longDateLabel` ("Friday 16 October 2026") |
| `components/DateStrip.jsx`, `SlotBoard.jsx` | Unchanged UI |

### Payment feature (`src/features/payment/`) and `src/lib/sslcommerz.js`
| File | What it does |
|---|---|
| `lib/sslcommerz.js` | `initSession`, `validateOrder(valId)`, `queryTransaction(tranId)`, `isSslczConfigured()`, `prettyMethod(cardType)`. Sandbox unless `SSLCZ_IS_LIVE=true`. `SSLCZ_API_BASE` is only for tests (local mock) |
| `service.js` | `startPayment(bookingId, user)`, `confirmPayment({ tranId, valId })` (idempotent; outcomes confirmed / slot_lost / duplicate / invalid / pending / unknown), `recheckPayment(tranId)`, `recheckOpenPayments()`, `markPaymentClosed(tranId, status)`, `getPaymentResult(tranId)` |
| `actions.js` | `payForBooking(bookingId)` → `{ ok, data: { url } }`; the client does `window.location.assign(url)` |
| `result-page.js` | `loadPaymentResult(page, searchParams)` for the three result pages (re-checks once on success if still initiated) |
| `components/PaymentResult.jsx` | States: success, pending, failed, cancelled, refund, missing. Google Calendar link |
| `components/RetryPayButton.jsx` | "Try payment again" |

Routes: `POST /api/payment/sslcommerz/[event]` (success, fail, cancel, ipn), `GET /api/cron/expire-holds`
(Bearer `CRON_SECRET`; `vercel.json` runs it daily at 03:00 Dhaka).

Payment rules:
- `tran_id` = `<booking code>-<6 chars>`, one `payments` row per attempt (`initiated` → `paid` | `failed` | `cancelled` | `refund_due` | `refunded`).
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
| `features/cms/actions/settings.js` | `saveBranding` (admin), `saveMenu` (admin), `saveFooterSeo`, `saveSliderSettings` |
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
| `service.js` | Server: `getCouponByCode`, `couponUses(coupon, userId)` (redemptions + active holds), `checkCouponForSlot`, `redeemCoupon(bookingId)` (once per booking) |

### Admin feature (`src/features/admin/`)
| File | What it does |
|---|---|
| `queries.js` | `countActiveHolds`, `getDashboardStats`, `getTodayBoard`, `getLatestBookings`, `getLiveContentSummary`, `getAdminBookings({ q, pitchId, status, range, page })`, `getAllPitchesAdmin`, `getPitchAdmin`, `getPitchEditorData(pitchId)` (default + next 30 days). `EDITOR_DAYS = 30`, `PAGE_SIZE = 25` |
| `actions/pitches.js` | Admin only: `upsertPitch`, `togglePitchActive`, `replaceDefaultBlocks`, `replaceDateBlocks`, `resetDateToDefault`, `regenerateDefaultBlocks`, `seedDateFromDefault` |
| `actions/bookings.js` | Admin only: `adminCancelBooking({ bookingId, reason })` (paid becomes `refund_due`), `markRefunded` (also marks its payments refunded), `createWalkInBooking` (confirmed, `source = walk_in`, BD phone check) |
| `commerce-queries.js` | `couponStatus`, `getCouponsAdmin()`, `getPaymentsAdmin({ q, status, page })` (`PAYMENTS_PAGE_SIZE = 25`), `getUsersAdmin({ q })` |
| `actions/coupons.js` | Admin only: `saveCoupon`, `setCouponActive`, `deleteCoupon` (refused once used); all `updateTag(TAGS.banners)` |
| `actions/payments.js` | Admin only: `adminRecheckPayment(tranId)` → `{ outcome, message }`, `markPaymentRefunded(paymentId)` |
| `actions/users.js` | Admin only: `setUserRole({ userId, role })` (not yourself, not the last admin) |
| `components/CouponsManager.jsx` | Codes table (switch, usage, discount given, status) + editor panel (limits, dates, grounds, days, hours) |
| `components/PaymentsTable.jsx` | URL tabs + search, refund/risky alerts, Check with SSLCommerz, Mark refunded, pagination |
| `components/UsersTable.jsx` | Search, role select (locked for yourself and the last admin) |
| `components/GroundsList.jsx` | Ground cards, open switch, Edit (PitchForm), Edit slots link, empty state |
| `components/PitchForm.jsx` | Add/edit ground dialog (`EMPTY_PITCH`); photo via ImageUploader (folder `pitches`) |
| `components/SlotEditor.jsx` | Tabs: Default schedule + 30 days; price, ±15/30 min, delete, add; custom day / reset / rebuild; sticky save bar |
| `components/BookingsTable.jsx` | URL-driven range tabs + filters, cancel dialog, mark refunded, pagination |
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
| `/login`, `/register` | **Live** (Better Auth, logo + side photo from CMS), forms wrapped in Suspense |
| `/admin` | **Live** overview |
| `/admin/pitches`, `/admin/pitches/[id]` | **Live**, admin only |
| `/admin/bookings` | **Live**, admin only (`?range=today|upcoming|week|all&q=&pitch=&status=&page=&walkin=1`) |
| `/admin/{branding,navigation}` | **Live**, admin only |
| `/admin/{hero,banners,sections,footer,media,terms}` | **Live**, admin or editor |
| `/admin/coupons` | **Live**, admin only |
| `/admin/payments` | **Live**, admin only (`?status=paid|started|failed|refund_due|refunded|risky&q=&page=`) |
| `/admin/users` | **Live**, admin only (`?q=`) |
| `/api/auth/[...all]` | Better Auth handler |
| `/api/booked-slots` | **Live** slot board JSON |

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

## 8. Step plan

- [x] **Step 0. UI, schema, auth** (done before 12 Oct)
- [x] **Step 1. Booking, player side** (12 Oct): schema fix + migration, time helpers, slot engine port, booking queries/actions, `/api/booked-slots`, `/book`, `/bookings`, admin guard, build fix.
- [x] **Step 2. SSLCommerz payments** (13 Oct): `lib/sslcommerz.js`, `features/payment/*`, one dynamic callback route `api/payment/sslcommerz/[event]` (success, fail, cancel, ipn), cron route + `vercel.json`, real result pages, Pay buttons live when the store is configured. See "Payment rules" in section 6.
- [x] **Step 3. Admin bookings side** (13 Oct): port prototype `admin.js`, `PitchesManager`, `SlotEditor` into `/admin/pitches` (ground editor, default blocks, per-date overrides); real `/admin/bookings` (filters, cancel, walk-in); real overview stats + `TonightBoard`.
- [x] **Step 4. CMS read side** (13 Oct): `features/cms/queries.js` (settings, nav, hero, banners, sections) with cache tags; replace sample data in `(site)` layout/home; `--brand` + metadata from settings; `LiveGrounds` with real pitches + free slots tonight.
- [x] **Step 5. CMS write side** (14 Oct): Cloudinary signed upload (no SDK) with verified results, media library + picker, server actions + live editors for branding, navigation, hero, banners, sections, footer/SEO, ground photos; up/down ordering; toasts; hero "shade" setting honoured on the site.
- [x] **Step 6 part 1** (15 Oct): coupons at checkout (preview, re-check on hold, free bookings, redemption on confirm), Coupons/Payments/Users admin pages, sample-data files deleted.
- [x] **Step 6 part 2** (15 Oct): `/profile`, `/terms` + terms editor, Show ticket, loading/error/not-found/global-error, sitemap/robots, env check at start-up, all lint errors fixed, `DEPLOY.md`.
- [ ] **Deploy**: follow `DEPLOY.md` (Vercel, live Neon branch, domain, Google OAuth, live SSLCommerz + IPN, external 15-min cron).
- [ ] Optional later: write admin actions to `audit_log`, booking confirmation emails, SSLCommerz refund API (needs a fixed IP).

## 9. Gotchas

| Problem | Fix |
|---|---|
| Turbopack crashes in dev | `npm run dev` already uses `--webpack` |
| `useSearchParams() should be wrapped in a suspense boundary` on build | Wrap that client component in `<Suspense>` in its page |
| Migration says relation exists | You ran `db:push` before; use either push or generate+migrate, not both, on the same database |
| Unique index migration fails | Existing duplicate active bookings for the same slot; cancel duplicates in `db:studio`, then migrate again |
| Hydration error on dates | Use `shortDateLabel()` / fixed arrays, not locale APIs |
| "Today" looks a day behind for a ground that opens late | Don't pass `openHour` to time helpers; `DAY_START_HOUR` is fixed at 6 |
| Editor can't see Grounds/Bookings | By design: those are `adminOnly`; set `role = admin` in `db:studio` |
| Admin edit doesn't show on the site | The save action must call `updateTag(TAGS.x)` (server actions) for the tag the public read uses |
| Upload: "isn't set up" / "couldn't be verified" | Cloudinary keys missing, or the secret doesn't match the cloud name and key |
| `next/image` error "hostname is not configured" | Use `unoptimized={!canOptimize(src)}`, or add the host to `next.config.mjs` |
| Pay button missing | `SSLCZ_STORE_ID` / `SSLCZ_STORE_PASSWORD` not set in `.env.local` (restart dev after editing) |
| IPN never arrives locally | Expected: SSLCommerz can't reach localhost. The browser success callback confirms instead; IPN works once deployed |
| Vercel deploy fails on cron schedule | Hobby plan allows daily crons only; keep `vercel.json` daily or use an external cron with the Bearer header |
| Stale styles | Delete `.next`, restart dev |
| `[env]` lines in the terminal at start-up | `src/lib/env.js` lists missing/placeholder variables (names only). Errors stop a live production server |
| Lint error `react-hooks/set-state-in-effect` | Don't reset state in an effect when a prop changes; compare with the previous value during render (`const [last, setLast] = useState(x); if (x !== last) {...}`) or key the loaded data (see `BookingClient` board) |
| Coupon "used up" with no paid uses | Active holds count as uses for 15 min |
| Coupon can't be deleted | It has redemptions; switch it off instead |

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->