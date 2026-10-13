# AI_CONTEXT.md: TurfZone CMS handoff

Paste this whole file into a new chat (Claude, Gemini, DeepSeek, any model) before asking for work,
then attach the source files the task touches. It is self-contained: everything a new model needs to
continue the project without the old chat. Last updated **13 Oct 2026**, after Steps 1 to 4 and Step 2.

In the repo, `Agents.md` holds the same facts in more detail (file tables, changelog) and `CLAUDE.md`
holds Claude Code's working rules. If this file and the code disagree, the code wins; fix this file.

---

## 1. The project in one paragraph

TurfZone CMS is a turf-booking website for **one venue** in Mirpur 12, Dhaka, Bangladesh (sample name
"TurfZone", three grounds, open 6 am to 3 am, prices in BDT ৳). Built by **Said** (civil engineer in
Dubai who also runs a digital agency, adEstra) for a client. Players pick a ground, a date and a time
block, pay online through **SSLCommerz** (bKash, Nagad, Rocket, cards) and get a booking ticket. The
**design is fixed in code**; the admin edits content only: logo, brand colour, hero slider, offer
banners, menu labels, home sections, footer, SEO, grounds and slot schedules. The UI was designed new;
the booking logic was ported from Said's earlier prototype (`turf.zip`, bKash replaced by SSLCommerz).

## 2. How Said works (follow this or he can't use your answer)

- **JavaScript only. No TypeScript**, no `.ts/.tsx`, no type annotations.
- Windows + PowerShell, project at `D:\projects\turf-cms`, env file is **`.env.local`**.
- Deliver **complete files**, never diffs or "rest unchanged" snippets. **Line 1 of every file is its
  path as a comment**: `// src/features/booking/queries.js` (JSON files can't hold comments; say the path).
- **No zip files.** Send files one by one and say for each: new or replace, and the exact folder.
  Use Windows paths in instructions (`src\app\api\...`). Spell out bracket folders exactly
  (`[event]`, `[id]`, `[...all]`), he has misplaced them before.
- Work in **steps** (one feature area at a time) and end each step with: files list, npm installs (if
  any), migrations (if any), and what to click to test.
- Plain, direct English. He is technical but not a full-time developer; explain env and deploy steps.
- **Route files must live under `src/app/`.** Anything under `src/features/` is not a URL.
- Never ask him to paste `.env.example` over `.env.local` (it wipes his real secrets). New env vars:
  tell him the exact lines to add.

## 3. Status

| Step | What | State |
|---|---|---|
| 0 | Full UI with sample data, schema, first migration, Better Auth, guards, proxy, seed | Done |
| 1 | Booking, player side: live slots, 15-min holds, My bookings | Done |
| 3 | Booking, admin side: overview, grounds + slot editor, bookings table, walk-ins, cancel/refund | Done |
| 4 | CMS read side: whole public site reads settings/nav/hero/banners/sections from the DB | Done |
| 2 | SSLCommerz payments: pay, callbacks, IPN, result pages, retry, lost-payment recheck, cron | Done (build + 38 integration tests + browser e2e against a mock gateway; Said is testing in the real sandbox) |
| **5** | **CMS write side: Cloudinary uploads + admin editors** | **Next** |
| 6 | Coupons at checkout, coupons/payments/users admin, profile/terms pages, polish, deploy | To do |

Said's current project was checked file by file on 13 Oct: identical to the delivered code (his
editor reformats whitespace; that's fine).

Open items on Said's side:
- `.env.local` still has placeholders for `SEED_ADMIN_EMAIL` and `CRON_SECRET`. To get an admin:
  set his real email, register on the site, run `npm run db:seed` again.
- SSLCommerz sandbox: store ID/password go in `.env.local`; Pay buttons stay hidden until both are set.

## 4. Stack and commands

Next.js **16.4** (App Router, webpack dev), React **19.3**, Tailwind **v4**, Drizzle ORM 0.45 +
drizzle-kit 0.31, **Neon Postgres** (`@neondatabase/serverless`, neon-http driver), **Better Auth** 1.7
(email/password + Google, `role` and `phone` extra fields), Zod 4, framer-motion, lucide-react,
embla-carousel (hero), clsx + tailwind-merge. Planned: Cloudinary (Step 5), Vercel hosting.

```
npm run dev          # next dev --webpack  (Turbopack crashes on his machine; keep --webpack)
npm run build        # must pass before delivering
npm run lint         # 8 errors + 2 warnings already exist (see section 13)
npm run db:generate  # after editing src/db/schema/*, then
npm run db:migrate   # apply to Neon (never mix with db:push on the same DB)
npm run db:seed      # idempotent: settings, nav, sections, hero, banners, coupons, 3 pitches, admin promotion
npm run db:studio
```

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
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` | Step 5 uploads |

`SSLCZ_API_BASE` exists only to point tests at a mock gateway; never set it in real env files.
Never print, log or commit `.env.local`.

## 6. Project map

```
src/
  proxy.js                     cookie check → /login for /admin, /bookings, /profile
  app/
    layout.jsx                 root: font, brand colour + SEO from site settings, force-dynamic
    (site)/                    public: layout (top bar, navbar, footer, popup), / , /book, /bookings,
                               /payment/success|failed|cancelled
    (auth)/                    /login, /register
    admin/                     layout (requireRole admin|editor, AdminShell); page (overview);
                               pitches/, pitches/[id]/ (slot editor), bookings/  ← live
                               branding, navigation, hero, banners, sections, footer, media,
                               coupons, payments, users                         ← still sample data
    api/auth/[...all]/route.js           Better Auth
    api/booked-slots/route.js            slot board JSON for /book and walk-ins
    api/payment/sslcommerz/[event]/route.js   POST success | fail | cancel | ipn
    api/cron/expire-holds/route.js       daily housekeeping (vercel.json: 21:00 UTC = 3 am Dhaka)
  components/
    ui/          Button, Badge, Dialog, Field/Input, Inputs (CharInput, TextInput, Select, Segmented), Switch
    site/        Navbar, TopBar, Footer, FooterCta, Logo, HeroSlider, QuickBook, PromoBanner,
                 PromoPopup, LiveGrounds, HowItWorks, VenueInfo, PitchLines
    admin/       AdminShell, Kit (PageHeader, Panel, SettingRow, Label, SaveBar, DragHandle, Table/Th/Td,
                 Toolbar), ImageUploader (UI only), StatusBadge, TonightBoard
    auth/        AuthForms, AuthLayout
  features/
    booking/     queries.js, actions.js, slots.js (pure slot engine), components/
    admin/       queries.js, actions/pitches.js, actions/bookings.js, components/
    cms/         queries.js (cached public reads), admin/ (editor UIs, sample data, Step 5 wires them)
    payment/     service.js, actions.js, result-page.js, components/PaymentResult + RetryPayButton
  db/            index.js (neon-http db), pool.js (unused WebSocket pool), schema/{auth,booking,commerce,cms}.js,
                 seed.js
  lib/           auth, auth-client, guards, action, time, utils, cache-tags, sslcommerz, env (unused),
                 sample-data, admin-sample-data
drizzle/         0000 initial schema, 0001 booking FKs + unique active-slot index
vercel.json      cron
```

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
        const user = await requireRoles(["admin", "editor"]);
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

- Tailwind v4 `@theme` tokens in `src/app/globals.css`: `chalk #f6f8f3` (page bg), `paper`, `pitch
  #0b3b2c` / `pitch-2` / `pitch-3` (dark green), `grass`, `line`, `ink #0f1f19` / `ink-2` / `ink-3` /
  `ink-4`; **brand** = `var(--brand)` (admin-set, default `#18a058`) with `brand-soft`, `brand-deep`,
  `brand-ink` (text on brand, computed for contrast); **flare `#ffb020` only for offers and "on hold"**;
  `danger`, `danger-soft`.
- Radii: `rounded-frame` 28px (big sections), `rounded-card` 20px, `rounded-ctl` 14px. Utilities:
  `display` (Archivo expanded headings), `wide`, `tnum`, `no-scrollbar`. Font: Archivo via
  `next/font/google` with the `wdth` axis.
- Visual motifs: chalk pitch lines (`PitchLines`), ticket perforations on cards. Keep new screens
  consistent with existing ones; reuse `components/ui` and `components/admin/Kit`.
- Copy: sentence case; buttons say exactly what happens ("Pay ৳2,000", "Save default"); errors say
  what to do next; no ALL-CAPS labels, no "·" separators, no arrows in button text.

## 9. Domain rules

### Roles
`user.role`: `user` (player), `editor` (website content only), `admin` (everything). Admin-only areas:
Branding, Navigation, Grounds & slots, Bookings, Payments, Coupons, Users (`adminOnly` in AdminShell
hides them from editors). Editors: Hero slides, Offer banners, Home sections, Footer & SEO, Media.

### Booking (ported from the prototype)
- Each pitch has `defaultBlocks` JSON `[{ startTime, endTime, price, sortOrder }]`, ids `default-<i>`.
  A date with rows in `time_blocks` uses those instead (per-date custom schedule, uuid ids).
- **Operating day starts at a fixed `DAY_START_HOUR = 6` for every ground.** Slots starting before 6:00
  belong to the previous day's sheet and keep that `bookingDate`. Never pass a ground's `openHour` to time
  helpers (that bug shifted "today" for late-opening grounds).
- A block is past once its start time passed on the current operating day (`isBlockPast`).
- Slot states: `free`, `held` (unexpired hold), `booked` (confirmed), `past`.
- Hold: `status = held`, `holdExpiresAt = now + 15 min`, price from the server. Max 2 active holds per
  player. Expired holds are ignored live, marked `expired` lazily and by the daily cron.
- **No double booking:** partial unique index `bookings_active_slot_uq` on
  `(pitch_id, booking_date, start_time) WHERE status IN ('held','confirmed')`.
- Statuses: `held`, `confirmed`, `cancelled`, `expired`, `completed` (displayed when a confirmed slot's time
  has passed). `paymentStatus`: `unpaid`, `paid`, `refund_due`, `refunded`. `source`: `online`, `walk_in`.
- Admin: walk-in bookings are confirmed immediately (paid at venue or not); cancelling a paid booking sets
  `refund_due`; "Mark refunded" sets `refunded` (refunds themselves are done by hand).

### Payments (SSLCommerz hosted checkout)
- `payForBooking(bookingId)` → `startPayment`: booking must be the player's and `held`; stretches the hold to
  15 min from now (never beyond 30 min after it was created); inserts a `payments` row (`initiated`,
  `tran_id = <booking code>-<6 chars>`); calls SSLCommerz init; client does `window.location.assign(url)`.
- Callback `POST /api/payment/sslcommerz/[event]`: success → `confirmPayment`; fail/cancel → payment marked
  `failed`/`cancelled`, booking stays held so the player can retry; ipn → same as success, server to server
  (can't reach localhost, works once deployed).
- `confirmPayment({ tranId, valId })` trusts **only** the Validation API (VALID/VALIDATED, same tran_id,
  currency BDT, same amount). It **claims** the payment with `UPDATE ... WHERE status <> 'paid' RETURNING`, so
  browser + IPN + cron racing confirm once. Then: booking `held`/`expired` → `confirmed` + `paid` (an expired
  hold is revived only if the unique index allows); slot gone or booking cancelled → booking `cancelled` +
  `refund_due`; booking already paid by another attempt → that payment `refund_due`.
- `/payment/success?tran=` re-asks SSLCommerz once if the payment is still `initiated`. The cron route
  re-checks payments opened 5 to 120 min ago and expires holds.
- Payments row statuses: `initiated`, `paid`, `failed`, `cancelled`, `refund_due`, `refunded`.
- Pay buttons only show when `isSslczConfigured()` (store ID + password set).

### CMS reads (Step 4)
`src/features/cms/queries.js`: every read is `unstable_cache` with a tag from `src/lib/cache-tags.js`
(`settings`, `nav`, `hero`, `banners`, `sections`) and a 5-minute safety revalidate, and falls back to
defaults if the DB fails (the site never crashes on CMS errors). **Step 5 saves must call
`updateTag(TAGS.<x>)`** for the matching tag. Banners: one live banner per placement (`top_bar`,
`home_after_hero`, `home_mid`, `booking_page`, `popup`), filtered by `isActive` and `startsAt/endsAt`; the
code shown comes from the linked coupon only if that coupon is live.

## 10. Database (Drizzle, `src/db/schema/`)

- **auth.js:** `user` (id text, name, email, image, `phone`, `role`), `session`, `account`, `verification`.
- **booking.js:** `pitches` (name, slug unique, description, sport, format, size, surface, hourlyRate,
  openHour, closeHour, defaultSlotMinutes, defaultBlocks jsonb, imagePublicId, imageUrl, sortOrder, isActive),
  `time_blocks` (pitchId, date, startTime, endTime, price, sortOrder, isActive).
- **commerce.js:** `coupons` (code unique, type percent|fixed, value, maxDiscount, minAmount, usageLimit,
  usedCount, perUserLimit, pitchIds jsonb, timeWindow jsonb, startsAt, endsAt, isActive), `bookings` (code
  unique, userId, customerName, customerPhone, pitchId, timeBlockId, bookingDate, startTime, endTime,
  subtotal, discount, totalPrice, couponId, status, paymentStatus, source, holdExpiresAt, cancelledAt,
  cancelReason), `coupon_redemptions` (couponId, userId, bookingId, amount), `payments` (bookingId, tranId
  unique, sessionKey, valId, bankTranId, cardType, amount, currency, status, riskLevel, riskTitle,
  refundRefId, raw jsonb), `audit_log` (actorId, action, entity, entityId, meta).
- **cms.js:** `site_settings` (single row id 1: siteName, tagline, logo light/dark url + publicId,
  favicon, brandColor, menuButtonLabel, showMyBookings, contact jsonb {phone,email,address,hours,mapUrl},
  socials jsonb [{platform,url}], seo jsonb {title,description,ogImageUrl}, slider jsonb
  {autoplayMs,pauseOnHover}), `nav_items` (label, href, sortOrder, isVisible), `hero_slides` (image +
  mobile image url/publicId, alt, eyebrow, heading, subheading, ctaLabel, ctaHref, overlay, sortOrder,
  isActive, startsAt, endsAt), `promo_banners` (placement, image, badge, title, body, ctaLabel, ctaHref,
  couponId, sortOrder, isActive, startsAt, endsAt), `page_sections` (key `live_grounds` | `how_it_works` |
  `visit`, isVisible, data jsonb), `media` (publicId unique, url, width, height, bytes, format,
  originalName, alt, folder, uploadedBy).

Schema changes: edit the schema file → `npm run db:generate` → `npm run db:migrate`. Tell Said both commands.

## 11. Key module APIs (use these, don't re-invent)

- `lib/time.js`: `DAY_START_HOUR`, `dhakaDate()`, `dhakaTime()`, `hhmmToMinutes`, `minutesToHHMM`,
  `addDaysISO(iso, n)`, `operatingMinutes(hhmm)`, `currentOperatingDay()` → `{ date, minutes }`,
  `isBlockPast(date, start)`, `shortDateLabel(iso)` → "Tue 13 Oct".
- `lib/guards.js`: `getSession()`, `requireUser(next)`, `requireRole(roles)` (redirects; for pages only).
- `lib/sslcommerz.js`: `isSslczConfigured`, `initSession`, `validateOrder`, `queryTransaction`, `prettyMethod`.
- `features/booking/queries.js`: `getPitches`, `getPitchById`, `toPitchView`, `getTimeBlocksForPitch`,
  `resolveBlock`, `getTakenSlots`, `getSlotBoard`, `getGroundsToday`, `expireStaleHolds`, `getMyBookings`,
  `getBookingForUser`, `HOLD_MINUTES`.
- `features/booking/actions.js`: `createBookingHold({ pitchId, blockId, date })`, `cancelHeldBooking(id)`.
- `features/admin/queries.js`: dashboard stats, today board, latest bookings, `getAdminBookings(filters)`,
  pitch admin reads, `getPitchEditorData`.
- `features/admin/actions/pitches.js` and `bookings.js`: ground CRUD, slot schedule edits, cancel,
  mark refunded, walk-in booking.
- `features/cms/queries.js`: `getSiteSettings`, `getNavItems`, `getHeroSlides`, `getPromoBanners`,
  `getSections`, `getSiteChrome`, `brandInk`.
- `features/payment/service.js`: `startPayment`, `confirmPayment`, `recheckPayment`, `recheckOpenPayments`,
  `markPaymentClosed`, `getPaymentResult`. `actions.js`: `payForBooking`.

## 12. Remaining work

### Step 5: CMS write side (next)

Goal: every admin content screen saves to the database and the public site updates immediately.

1. **Cloudinary uploads.** `npm i cloudinary`. `src/lib/cloudinary.js` (server only) configured from env.
   Server action `getUploadSignature({ folder })` (admin or editor) signs `timestamp` + `folder` with
   `cloudinary.utils.api_sign_request`. Client uploads the file directly to
   `https://api.cloudinary.com/v1_1/<cloud>/image/upload` (signature, timestamp, api_key, folder), then calls
   `saveMedia(result)` which inserts into `media` and returns `{ url, publicId }`. Make
   `components/admin/ImageUploader.jsx` real (it has idle/uploading/done states already). Limit type
   (jpg/png/webp/svg for logos) and size (e.g. 5 MB). Media library: list, copy URL, delete (also
   `cloudinary.uploader.destroy`; warn if the image is still used).
2. **Actions** under `src/features/cms/actions/`: settings (branding: name, tagline, logos, favicon, brand
   colour `#rrggbb`, menu button label, show My bookings; footer & SEO: contact, socials, seo, slider
   timing), navigation (add, edit, hide, reorder, delete), hero slides (CRUD, reorder, show/hide, schedule,
   mobile image), offer banners (CRUD per placement, link a coupon, schedule), home sections (texts, steps,
   facilities, visibility), media. Zod: links start with `/` or `https://`; length limits matching the
   editors' `CharInput max`. Every save: `updateTag(TAGS.x)` + `revalidatePath` of the admin page.
3. **Admin reads** (not cached, include hidden/inactive rows) in `src/features/cms/admin-queries.js`, and
   replace the sample-data imports in `src/app/admin/{branding,navigation,hero,banners,sections,footer,media}/page.jsx`.
   Branding and Navigation pages: `requireRole(["admin"])`.
4. Wire the editor components in `src/features/cms/admin/*` (they are UI-only now): controlled state, the
   `SaveBar` from Kit when dirty, success/error feedback. Reordering: up/down buttons are fine; `@dnd-kit`
   optional.
5. When nothing imports `src/lib/sample-data.js` any more, delete it (`admin-sample-data.js` goes in Step 6).

### Step 6: coupons, admin tables, missing pages, polish, deploy

- **Coupons at checkout:** `BookingSummary` has a hidden coupon box (`showCoupon`, currently fake 20%).
  Add a server `previewCoupon({ code, pitchId, blockId, date })` and pass `couponCode` into
  `createBookingHold`, which validates (active, dates, usage limit vs `usedCount`, per-user limit via
  `coupon_redemptions`, `minAmount`, `pitchIds`, `timeWindow`), computes discount (percent capped by
  `maxDiscount`, or fixed), stores `subtotal/discount/totalPrice/couponId`. Insert the redemption and
  increment `usedCount` **only when the payment confirms** (in `settleBooking`, `features/payment/service.js`).
  Then switch on the seeded FIRST200 popup banner.
- **Coupons admin** (`CouponsManager`), **Payments admin** (`PaymentsTable`: payments joined to bookings,
  filters, "Check with SSLCommerz" button → `recheckPayment`, risk flag when `riskLevel = "1"`, refund-due
  list), **Users admin** (`UsersTable`: role change, admin only, can't demote yourself or the last admin).
  Add `requireRole(["admin"])` to `/admin/coupons`, `/admin/payments`, `/admin/users` pages.
- **Missing pages:** `/profile` (name, phone; linked from navbar and footer, currently 404) and `/terms`
  (booking terms, footer link, 404). The "Show ticket" button on confirmed tickets does nothing yet
  (show a ticket dialog with the code, optionally a QR).
- **Polish:** `loading.jsx`/`error.jsx`/`not-found.jsx`, sitemap/robots, write to `audit_log` from admin
  actions, import `src/lib/env.js` (add Cloudinary/SSLCommerz vars to its schema), fix lint errors.
- **Deploy (Vercel):** set all env vars; `APP_URL` and `BETTER_AUTH_URL` = the real domain; Google OAuth
  redirect `https://<domain>/api/auth/callback/google`; run `db:migrate` + `db:seed` against the production
  DB; SSLCommerz live store, set `SSLCZ_IS_LIVE=true`, register the IPN URL
  `https://<domain>/api/payment/sslcommerz/ipn` in the merchant panel; `CRON_SECRET` set (Hobby plan allows
  daily crons only, which `vercel.json` uses). Refunds stay manual (SSLCommerz refund API needs a whitelisted
  static IP, which Vercel doesn't have).

## 13. Known issues and gotchas

| Issue | Fix / note |
|---|---|
| `SEED_ADMIN_EMAIL`, `CRON_SECRET` are placeholders in Said's `.env.local` | Set real values (section 3) |
| `/admin/{coupons,payments,users,branding,navigation}` hidden from editors in the menu but not role-checked on the page | Add `requireRole(["admin"])` when wiring them (Steps 5 and 6) |
| `src/lib/action.js` turns `requireRole` redirects into a generic error | Don't use it (section 7, rule 10) |
| `npm run lint`: 8 errors, 2 warnings (`react-hooks/set-state-in-effect`, unescaped `'`) | Pre-existing; fix in Step 6 |
| `src/lib/env.js`, `src/db/pool.js` not used | Leave or wire up in Step 6 |
| Seeded banners show code NIGHT20 before coupons work at checkout | Expected until Step 6 |
| `/profile`, `/terms` 404; "Show ticket" no-op | Step 6 |
| Turbopack crash | Keep `--webpack` |
| "Unknown at rule @theme" | `tailwindcss` + `@tailwindcss/postcss` + `postcss.config.mjs` |
| `useSearchParams() should be wrapped in a suspense boundary` | Wrap in `<Suspense>` in the page |
| Hydration error on dates | `shortDateLabel()`, not locale APIs |
| `next/image` "hostname not configured" | `unoptimized={!canOptimize(src)}` or add the host to `next.config.mjs` |
| `password authentication failed for user 'USER'` | `.env.local` has the template `DATABASE_URL`; put the real Neon string back |
| Payment callback 404 | Route file not at `src/app/api/payment/sslcommerz/[event]/route.js` |
| IPN never arrives locally | Expected; works after deploy |
| Migration "relation exists" | `db:push` was used before; don't mix push and migrate |

There is no test suite in the repo. Earlier work was verified with `npm run build`, integration tests run
against an in-memory Postgres (PGlite) outside the repo, and browser screenshots. At minimum: run
`npm run build` and give Said click-through test steps.

## 14. End of every session

1. `npm run build` passes.
2. Update this file (sections 3, 12, 13) and `Agents.md` (step plan + changelog) to match the code.
3. Deliver files with paths and new/replace, plus installs, migrations and test steps.