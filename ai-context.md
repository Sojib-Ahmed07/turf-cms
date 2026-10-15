# AI_CONTEXT.md: TurfZone CMS handoff

Paste this whole file into a new chat (Claude, Gemini, DeepSeek, any model) before asking for work,
then attach the source files the task touches. It is self-contained: everything a new model needs to
continue the project without the old chat. Last updated **15 Oct 2026**, after Steps 1 to 6 (all build steps done).

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
| **Deploy** | **Vercel + live Neon branch + domain + live SSLCommerz, following `DEPLOY.md`** | **Next** |

The local project was checked file by file on 15 Oct (before Step 6): identical to the delivered code (his
editor reformats whitespace; that's fine). The sample-data files are deleted in Step 6 part 1.

Open items on the developer's side:
- `.env.local` still has placeholders for `SEED_ADMIN_EMAIL` and `CRON_SECRET`. To get an admin:
  set the real email, register on the site, run `npm run db:seed` again.
- SSLCommerz sandbox: store ID/password go in `.env.local`; Pay buttons stay hidden until both are set.
- Cloudinary keys are empty in `.env.local` (as of 15 Oct), so admin uploads are off until they're added back.
- The default booking terms are a draft; the venue must check them in Admin, Booking terms.
- The seeded FIRST200 popup (Offer banners) is still switched off; turn it on now that coupons work.

## 4. Stack and commands

Next.js **16.4** (App Router, webpack dev), React **19.3**, Tailwind **v4**, Drizzle ORM 0.45 +
drizzle-kit 0.31, **Neon Postgres** (`@neondatabase/serverless`, neon-http driver), **Better Auth** 1.7
(email/password + Google, `role` and `phone` extra fields), Zod 4, framer-motion, lucide-react,
embla-carousel (hero), clsx + tailwind-merge. Cloudinary is used without its SDK (signed REST calls,
`src/lib/cloudinary.js`). Planned: Vercel hosting.

```
npm run dev          # next dev --webpack  (Turbopack crashes on this machine; keep --webpack)
npm run build        # must pass before delivering
npm run lint         # clean; keep it that way
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
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Uploads (only these three needed). Optional `CLOUDINARY_FOLDER` (default `turfzone`). Old name `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` still works |

`SSLCZ_API_BASE` and `CLOUDINARY_API_BASE` exist only to point tests at mocks; never set them in real env files.
Never print, log or commit `.env.local`.

## 6. Project map

```
src/
  proxy.js                     cookie check → /login for /admin, /bookings, /profile
  app/
    layout.jsx                 root: font, brand colour + SEO from site settings, force-dynamic
    (site)/                    public: layout (top bar, navbar, footer, popup), / , /book, /bookings,
                               /profile, /terms, /payment/success|failed|cancelled; loading.jsx, error.jsx
    not-found.jsx, global-error.jsx, sitemap.js, robots.js
    (auth)/                    /login, /register
    admin/                     layout (requireRole admin|editor, AdminShell); page (overview);
                               pitches/, pitches/[id]/ (slot editor), bookings/,
                               branding, navigation, hero, banners, sections, footer, media, terms,
                               coupons, payments, users (admin only)  ← all live
    api/auth/[...all]/route.js           Better Auth
    api/booked-slots/route.js            slot board JSON for /book and walk-ins
    api/payment/sslcommerz/[event]/route.js   POST success | fail | cancel | ipn
    api/cron/expire-holds/route.js       daily housekeeping (vercel.json: 21:00 UTC = 3 am Dhaka)
  components/
    ui/          Button, Badge, Dialog, Field/Input, Inputs (CharInput, TextInput, Select, Segmented), Switch
    site/        Navbar, TopBar, Footer, FooterCta, Logo, HeroSlider, QuickBook, PromoBanner,
                 PromoPopup, LiveGrounds, HowItWorks, VenueInfo, PitchLines
    admin/       AdminShell, Kit (PageHeader, Panel, SettingRow, Label, SaveBar, OrderButtons, Table/Th/Td,
                 Toolbar), ImageUploader (Cloudinary upload + library picker), MediaPicker, Toast (useToast),
                 StatusBadge, TonightBoard
    auth/        AuthForms, AuthLayout
  features/
    booking/     queries.js, actions.js, slots.js (pure slot engine), calendar.js, components/ (TicketDialog)
    profile/     actions.js (updateProfile), components/ProfileClient.jsx
    admin/       queries.js, commerce-queries.js (coupons/payments/users admin reads),
                 actions/{pitches,bookings,coupons,payments,users}.js, components/
    coupons/     rules.js (pure: evaluateCoupon, labels), service.js (DB: check, uses, redeemCoupon)
    cms/         queries.js (cached public reads), admin-queries.js (uncached admin reads), server-utils.js,
                 actions/{settings,hero,banners,sections,media}.js, upload-client.js, admin/ (8 editors)
    payment/     service.js, actions.js, result-page.js, components/PaymentResult + RetryPayButton
  db/            index.js (neon-http db), pool.js (unused WebSocket pool), schema/{auth,booking,commerce,cms}.js,
                 seed.js
  lib/           auth, auth-client, guards, action, time, utils, cache-tags, sslcommerz, cloudinary,
                 env (start-up check, called from src/instrumentation.js)
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
- **Day start (per sheet):** a "sheet" is one ground's slots for one date (default schedule, or a custom one for that
  date). Its day starts at its **first slot** (`dayStartOf(blocks)`, minutes), e.g. 05:00, 06:00 or 16:00. A slot starting
  earlier than that (01:30 on a 06:00 sheet) is played after midnight on the next calendar day but stays on that sheet and
  is stored with its `bookingDate`. There is no fixed 6 am any more (`DEFAULT_DAY_START` is only the fallback for an empty sheet).
- **Past slots:** `isBlockPast(date, start, dayStart)` compares the slot's real start (date + time, next day if after
  midnight) with the time in Dhaka. Always pass the sheet's `dayStart`: `resolveBlock()` returns it as `block.dayStart`,
  `getSheetDayStarts([{ pitchId, date }])` gives it for booking rows, and booking views carry `dayStart`.
- **"Today":** `currentVenueDay()` (booking queries). Yesterday stays "today" only while an open ground's sheet for
  yesterday still has after-midnight slots running (`nightEndOf`); a 5 am to 10 pm venue switches at midnight.
- Parts of the day: `features/booking/parts.js` (morning < 12, afternoon < 17, evening < 22, late = 22+ or after midnight).
- Editing a ground's hours or slot length in the Edit form rebuilds its default slots (same-time slots keep their price).
- Footer/"Find us" hours: typed text in Footer & SEO wins; empty = automatic from the grounds (`withVenueHours`).
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

### Coupons (Step 6 part 1)
- Rules in `features/coupons/rules.js` `evaluateCoupon(coupon, ctx)` (pure): active; inside `startsAt/endsAt`;
  `usageLimit` vs `usedCount` **plus active holds using the code**; `perUserLimit` vs the player's redemptions plus
  their own active holds; `minAmount`; `pitchIds` (empty = all); `timeWindow` `{ days:[0-6], from, to }` checked on
  the operating-day clock (a 1 am slot counts as the previous evening). Percent is capped by `maxDiscount`; the
  discount never exceeds the price.
- `/book`: the summary has an Apply box → `previewCoupon` (server, prices re-read). It re-checks when the slot
  changes and drops the code with a message if it no longer applies. `createBookingHold({ ..., couponCode })`
  re-validates and stores `subtotal`, `discount`, `totalPrice`, `couponId` (`couponError: true` on failure).
- **Total 0 (100% off):** the booking is confirmed and marked paid at once, no SSLCommerz, `data.free = true`.
- `redeemCoupon(bookingId)` inserts `coupon_redemptions` and bumps `usedCount` once per booking; it runs when the
  payment confirms (`settleBooking`) or immediately for a free booking.
- Admin (`/admin/coupons`, `actions/coupons.js`): create/edit (code `A-Z 0-9 _ -`, 3 to 20 chars, unique), on/off,
  delete (refused once used; switch it off instead). Status: active, scheduled, ended, used_up, hidden. Saves call
  `updateTag(TAGS.banners)` because banners show the linked code only while it is live.

### Admin payments and users (Step 6 part 1)
- `/admin/payments?status=paid|started|failed|refund_due|refunded|risky&q=&page=` (25 per page). "Check with
  SSLCommerz" on started/failed/cancelled rows → `adminRecheckPayment(tranId)` (`recheckPayment`). "Mark refunded"
  → `markPaymentRefunded(paymentId)` for a `refund_due` payment or a paid payment whose booking is refund due
  (also sets the booking to `refunded`). The bookings page's `markRefunded` updates the payments too.
- `/admin/users?q=`: `setUserRole({ userId, role })`, admin only; you can't change your own role; the last admin
  stays admin. Takes effect on the person's next page load. Staff are added by registering, then changing role.

### Profile, terms, ticket (Step 6 part 2)
- `/profile` (sign-in required): name + mobile via `updateProfile` (phone stored as `01XXXXXXXXX`, empty allowed), email
  read-only, change password with `authClient.changePassword({ revokeOtherSessions: true })` (only for email/password
  accounts; Google-only accounts see a note), booking counts, sign out.
- `/terms`: `page_sections` row `terms`, data `{ heading, intro, items: [{ title, body }] }`. Defaults (`DEFAULT_TERMS`)
  until an admin/editor saves in Admin, Booking terms. Blank line in a body = new paragraph. Contact box uses Footer & SEO.
- Show ticket (My bookings, confirmed only): `TicketDialog` with booking code, ground, real play date (after-midnight
  slots show the next calendar day + "Night of ..."), time, player, payment, Add to calendar. No QR (nothing scans it).
- Env check: `src/instrumentation.js` → `assertEnv()` on server start. Prints `[env]` warnings/errors (names only).
  Throws only on a production server whose `APP_URL` isn't localhost (https, `CRON_SECRET`, no test-only vars).

### CMS reads (Step 4)
`src/features/cms/queries.js`: every read is `unstable_cache` with a tag from `src/lib/cache-tags.js`
(`settings`, `nav`, `hero`, `banners`, `sections`) and a 5-minute safety revalidate, and falls back to
defaults if the DB fails (the site never crashes on CMS errors). **Step 5 saves must call
`updateTag(TAGS.<x>)`** for the matching tag. Banners: one live banner per placement (`top_bar`,
`home_after_hero`, `home_mid`, `booking_page`, `popup`), filtered by `isActive` and `startsAt/endsAt`; the
code shown comes from the linked coupon only if that coupon is live.

### CMS writes and uploads (Step 5)
- Save actions in `src/features/cms/actions/`: `settings.js` (`saveBranding` admin, `saveMenu` admin,
  `saveFooterSeo`, `saveSliderSettings`), `hero.js` (`saveHeroSlide`, `setHeroSlideActive`, `deleteHeroSlide`,
  `moveHeroSlide`), `banners.js` (`saveBanner`, `setBannerActive`, `deleteBanner`, `moveBanner` within a placement),
  `sections.js` (`saveSections`), `media.js` (`getUploadSignature`, `saveMedia`, `listMediaForPicker`,
  `updateMediaAlt`, `deleteMedia`). Every save calls `updateTag(TAGS.x)` and the public site shows the change on the
  next request (verified on a production build). Shared Zod pieces and `requireRoles` are in `cms/server-utils.js`.
- Links typed by admins must start with `/` (not `//`) or `https://` (also `tel:`/`mailto:`); images must be https.
- Schedules are Dhaka calendar dates: "Show from" = that day 00:00 Dhaka, "Hide after" = stored as the next midnight.
  Status shown in the admin: active, scheduled, ended, hidden.
- Navigation: labels, visibility and order of the existing links only (the URLs are fixed by design).
- Uploads: browser gets a signature from `getUploadSignature(folder)` (folders: branding, hero, banners, pitches,
  seo, misc, inside `CLOUDINARY_FOLDER`), posts the file straight to Cloudinary, then `saveMedia` stores it **only
  if Cloudinary's response signature verifies** (SHA-1 or SHA-256 of `public_id` + `version` + secret) and the URL
  is on our cloud. `deleteMedia` refuses while the image is used (logo, favicon, share image, hero, banner, ground).
- Ordering uses up/down buttons (`OrderButtons`), no drag-and-drop library.

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

Schema changes: edit the schema file → `npm run db:generate` → `npm run db:migrate`. Give both commands.

## 11. Key module APIs (use these, don't re-invent)

- `lib/time.js`: `DEFAULT_DAY_START` (fallback only), `dhakaDate()`, `dhakaTime()`, `hhmmToMinutes`, `minutesToHHMM`,
  `addDaysISO(iso, n)`, `dayStartOf(blocks)`, `isAfterMidnight(hhmm, dayStart)`, `operatingMinutes(hhmm, dayStart)`,
  `playDateOf`, `isBlockPast(date, start, dayStart)`, `nightEndOf(blocks)`, `currentOperatingDay(nightEnd)` → `{ date, minutes }`,
  `shortDateLabel(iso)` → "Tue 13 Oct". "Today" for pages: `currentVenueDay()` in `features/booking/queries.js`.
- `lib/guards.js`: `getSession()`, `requireUser(next)`, `requireRole(roles)` (redirects; for pages only).
- `lib/sslcommerz.js`: `isSslczConfigured`, `initSession`, `validateOrder`, `queryTransaction`, `prettyMethod`.
- `features/booking/queries.js`: `getPitches`, `getPitchById`, `toPitchView`, `getTimeBlocksForPitch`,
  `resolveBlock`, `getTakenSlots`, `getSlotBoard`, `getGroundsToday`, `expireStaleHolds`, `getMyBookings`,
  `getBookingForUser`, `HOLD_MINUTES`.
- `features/booking/actions.js`: `previewCoupon({ code, pitchId, blockId, date })`,
  `createBookingHold({ pitchId, blockId, date, couponCode? })` (returns `data.free` for a 0 total), `cancelHeldBooking(id)`.
- `features/coupons/service.js`: `getCouponByCode`, `couponUses`, `checkCouponForSlot`, `redeemCoupon(bookingId)`.
- `features/admin/commerce-queries.js`: `getCouponsAdmin`, `getPaymentsAdmin(filters)`, `getUsersAdmin({ q })`.
- `features/admin/queries.js`: dashboard stats, today board, latest bookings, `getAdminBookings(filters)`,
  pitch admin reads, `getPitchEditorData`.
- `features/admin/actions/pitches.js` and `bookings.js`: ground CRUD, slot schedule edits, cancel,
  mark refunded, walk-in booking.
- `features/cms/queries.js`: `getSiteSettings`, `getNavItems`, `getHeroSlides`, `getPromoBanners`,
  `getSections`, `getSiteChrome`, `brandInk`.
- `features/payment/service.js`: `startPayment`, `confirmPayment`, `recheckPayment`, `recheckOpenPayments`,
  `markPaymentClosed`, `getPaymentResult`. `actions.js`: `payForBooking`.

## 12. Remaining work

### Step 5: CMS write side (done 14 Oct)

See "CMS writes and uploads" in section 9. Ground photos in `PitchForm` also use the uploader now.

### Step 6 part 1: coupons, coupons/payments/users admin (done 15 Oct)

See "Coupons" and "Admin payments and users" in section 9. The sample-data files are gone.

### Step 6 part 2 (done 15 Oct)

See "Profile, terms, ticket" in section 9.

### Deploy (next)

Follow `DEPLOY.md` in the repo root: separate Neon branch, migrate + seed with `$env:DATABASE_URL`, Vercel env vars,
domain, Google OAuth redirect, owner promoted to admin, live SSLCommerz store + IPN URL
`https://<domain>/api/payment/sslcommerz/ipn`, `SSLCZ_IS_LIVE=true`, daily Vercel cron plus an external 15-minute cron
(cron-job.org with `Authorization: Bearer <CRON_SECRET>`). Refunds stay manual.

### Optional later
- Write admin actions to `audit_log` (table exists, unused).
- Booking confirmation email/SMS.
- SSLCommerz refund API (needs a fixed server IP).

## 13. Known issues and gotchas

| Issue | Fix / note |
|---|---|
| `SEED_ADMIN_EMAIL`, `CRON_SECRET` are placeholders in `.env.local` | Set real values (section 3) |
| Upload says "Image uploads aren't set up yet" | Cloudinary keys missing in `.env.local`; restart dev after adding |
| Upload says "couldn't be verified" | `CLOUDINARY_API_SECRET` doesn't match the cloud name/key, or the account signs with another key |
| Change saved but home page still old | Make sure the action calls `updateTag(TAGS.x)` for the tag the public read uses |
| Seeded SEO title still says "TurfZone" after renaming | By design: Footer & SEO > Page title overrides the site name; edit or clear it there |
| `src/lib/action.js` turns `requireRole` redirects into a generic error | Don't use it (section 7, rule 10) |
| Lint `react-hooks/set-state-in-effect` | Don't reset state in an effect on prop change; compare with the previous value during render, or key loaded data (see `BookingClient`) |
| `[env]` lines at start-up | Missing/placeholder env vars (`src/lib/env.js`). Errors stop a live production server |
| `src/db/pool.js` not used | Leave it |
| "This code has been used up" while nobody has paid | Active holds count as uses for 15 min (so two players can't both claim the last use) |
| Can't delete a coupon | It has been used; switch it off instead (keeps the payment history right) |
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
`npm run build` and give click-through test steps.

## 14. End of every session

1. `npm run build` passes.
2. Update this file (sections 3, 12, 13) and `Agents.md` (step plan + changelog) to match the code.
3. Deliver files with paths and new/replace, plus installs, migrations and test steps.