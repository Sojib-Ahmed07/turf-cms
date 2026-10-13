# AGENTS.md — TurfZone CMS, current progress

Read this file first in every new chat. It records what exists in the codebase right now, how it is
written, and what to do next. The complete end-state plan (database, payments, every action, all
phases) is in `BLUEPRINT.md`; read the relevant section before building a feature.

At the end of every session, update section 8 (Step plan) and section 10 (Changelog).

## 1. Project in one paragraph

TurfZone CMS is a turf-booking website for one venue in Bangladesh, built by Said for a client.
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
- **Next:** Step 4, CMS read side (home page live), then Step 2, SSLCommerz payments (section 8).

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
  Expired holds are marked `expired` lazily (`expireStaleHolds`) before a new hold, and by a cron job in Step 2.
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
| `pool.js` | `getTxDb()` WebSocket Pool for interactive transactions (Step 2 payment confirm) |
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
| `cache-tags.js`, `env.js`, `utils.js` | tags, env validation, `cn`/`taka`/`time12` |
| `sample-data.js`, `admin-sample-data.js` | still used by home page, CMS and admin screens not yet wired |

### Booking feature (`src/features/booking/`)
| File | What it does |
|---|---|
| `slots.js` | Prototype slot engine (pure): generate/validate/resize/delete blocks, 12h formatting. Used by the admin slot editor in Step 3 |
| `queries.js` | `getPitches`, `getPitchById`, `toPitchView`, `getTimeBlocksForPitch`, `resolveBlock`, `getTakenSlots`, `getSlotBoard`, `expireStaleHolds`, `getMyBookings`, `getBookingForUser`, `HOLD_MINUTES` |
| `actions.js` | `createBookingHold({ pitchId, blockId, date })`, `cancelHeldBooking(bookingId)` |
| `components/BookingClient.jsx` | Real data: fetches `/api/booked-slots`, loading/error/empty states, reserve, redirects to login with `next` |
| `components/BookingSummary.jsx` | `onPay`, `busy`, `error`, `isSignedIn`, `showCoupon` (hidden until coupons) |
| `components/PitchPicker.jsx` | Falls back to pitch lines when a ground has no photo |
| `components/MyBookingsClient.jsx` | Real bookings, "reserved for you" notice, cancel held, `paymentsLive` flag |
| `components/BookingTicket.jsx` | `onCancel`, `payHref`, `busy`, `highlight` |
| `components/DateStrip.jsx`, `SlotBoard.jsx` | Unchanged UI |

### Admin feature (`src/features/admin/`)
| File | What it does |
|---|---|
| `queries.js` | `countActiveHolds`, `getDashboardStats`, `getTodayBoard`, `getLatestBookings`, `getLiveContentSummary`, `getAdminBookings({ q, pitchId, status, range, page })`, `getAllPitchesAdmin`, `getPitchAdmin`, `getPitchEditorData(pitchId)` (default + next 30 days). `EDITOR_DAYS = 30`, `PAGE_SIZE = 25` |
| `actions/pitches.js` | Admin only: `upsertPitch`, `togglePitchActive`, `replaceDefaultBlocks`, `replaceDateBlocks`, `resetDateToDefault`, `regenerateDefaultBlocks`, `seedDateFromDefault` |
| `actions/bookings.js` | Admin only: `adminCancelBooking({ bookingId, reason })` (paid becomes `refund_due`), `markRefunded`, `createWalkInBooking` (confirmed, `source = walk_in`, BD phone check) |
| `components/GroundsList.jsx` | Ground cards, open switch, Edit (PitchForm), Edit slots link, empty state |
| `components/PitchForm.jsx` | Add/edit ground dialog (`EMPTY_PITCH`); photo is a link for now (Cloudinary in Step 5) |
| `components/SlotEditor.jsx` | Tabs: Default schedule + 30 days; price, ±15/30 min, delete, add; custom day / reset / rebuild; sticky save bar |
| `components/BookingsTable.jsx` | URL-driven range tabs + filters, cancel dialog, mark refunded, pagination |
| `components/WalkInDialog.jsx` | Walk-in/phone booking form; slots from `/api/booked-slots` |

Shared: `src/components/ui/Dialog.jsx` (modal), `src/components/admin/TonightBoard.jsx` (props `{ rows, from, to, now }`),
`src/components/admin/AdminShell.jsx` (`adminOnly` nav items, held-bookings badge from `counts.held`).

### Routes
| Route | Status |
|---|---|
| `/` | UI with sample data (CMS read side in Step 4) |
| `/book` | **Live** (`(site)/book/page.jsx`) |
| `/bookings` | **Live**, requires sign-in |
| `/payment/*` | UI with sample data (Step 2) |
| `/login`, `/register` | **Live** (Better Auth), forms wrapped in Suspense |
| `/admin` | **Live** overview |
| `/admin/pitches`, `/admin/pitches/[id]` | **Live**, admin only |
| `/admin/bookings` | **Live**, admin only (`?range=today|upcoming|week|all&q=&pitch=&status=&page=&walkin=1`) |
| other `/admin/*` | Protected by `requireRole(["admin","editor"])`; still sample data (Steps 5 and 6) |
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
- `.gitignore` has `.env*`, which also ignores `.env.example`. Add a line `!.env.example`.
- `src/lib/env.js` is not imported anywhere yet; import it in `src/lib/auth.js` and `src/db/index.js` when convenient.
- Home page "Grounds open today" still shows sample grounds (Step 4).
- `BookingSummary` shows a fixed venue line ("Mirpur 12, Dhaka"); switch to `site_settings.contact.address` in Step 4.

## 8. Step plan

- [x] **Step 0. UI, schema, auth** (done before 12 Oct)
- [x] **Step 1. Booking, player side** (12 Oct): schema fix + migration, time helpers, slot engine port, booking queries/actions, `/api/booked-slots`, `/book`, `/bookings`, admin guard, build fix.
- [ ] **Step 2. SSLCommerz payments**
  - `src/lib/sslcommerz.js` (initSession, validate, refund; sandbox/live by `SSLCZ_IS_LIVE`)
  - `src/features/payment/actions.js` `initPayment(bookingId)`; `/payment/start` page that redirects to the gateway
  - Route handlers `src/app/api/payment/sslcommerz/{success,fail,cancel,ipn}/route.js` (POST)
  - `src/features/payment/confirm.js` `validateAndConfirm()` (idempotent, amount/tran_id/currency checks, transaction)
  - `src/app/api/cron/expire-holds/route.js` + cron setup
  - Real `/payment/success|failed|cancelled` pages; turn on `paymentsLive` and the Pay button
- [x] **Step 3. Admin bookings side** (13 Oct): port prototype `admin.js`, `PitchesManager`, `SlotEditor` into `/admin/pitches` (ground editor, default blocks, per-date overrides); real `/admin/bookings` (filters, cancel, walk-in); real overview stats + `TonightBoard`.
- [ ] **Step 4. CMS read side**: `features/cms/queries.js` (settings, nav, hero, banners, sections) with cache tags; replace sample data in `(site)` layout/home; `--brand` + metadata from settings; `LiveGrounds` with real pitches + free slots tonight.
- [ ] **Step 5. CMS write side**: Cloudinary signed upload, media library, server actions + forms for branding, navigation, hero, banners, sections, footer/SEO; dnd-kit ordering; toasts.
- [ ] **Step 6. Coupons, users, payments admin, polish, deploy**: coupons in checkout, users/roles page, payments table + re-check/refund, loading/error pages, SEO, production env, live SSLCommerz.

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
| Stale styles | Delete `.next`, restart dev |

## 10. Changelog
- 2026-10-11: Blueprint agreed. Phase 0 UI built (73 files). Project set up in `D:\projects\turf-cms`.
- Before 2026-10-12 (Said): schema split into auth/booking/cms/commerce, first migration, seed, Better Auth, auth forms, navbar session, guards, proxy, env, action wrapper.
- 2026-10-12: Review + Step 1 (booking, player side). Fixed auth route location, bookings FKs + double-booking index, build failure on /login, env file mismatch, admin guard.
- 2026-10-13: Step 3 (booking, admin side). Admin queries/actions, grounds + slot editor, bookings table + walk-ins, real overview, Dialog component, admin-only nav. Fixed operating day to a fixed 6 am start (`DAY_START_HOUR`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->