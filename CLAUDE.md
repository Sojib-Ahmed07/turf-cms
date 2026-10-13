# CLAUDE.md — TurfZone CMS

Turf-booking site + CMS for one venue in Dhaka (Next.js 16.4 App Router, React 19.3, Tailwind v4,
Drizzle + Neon Postgres, Better Auth, Zod 4). **JavaScript only, no TypeScript.**

@Agents.md

`Agents.md` (imported above) is the source of truth for progress, conventions, booking rules, file map
and the step plan. This file adds the working rules for Claude. If the two disagree, `Agents.md` wins;
fix the drift. `AI_CONTEXT.md` is the same handoff for other models (Gemini, DeepSeek); keep its
sections 3, 12 and 13 in sync at the end of a session.

## Do not read

`node_modules/`, `.next/`, `.git/`, `package-lock.json`, `drizzle/meta/*.json` (generated snapshots),
`public/` binaries. Never print or commit `.env.local` (holds `DATABASE_URL`, `BETTER_AUTH_SECRET`, Google keys).

Exception: before using a Next.js API you are unsure about, read the matching guide in
`node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`). Next 16 differs from older versions
(`proxy.js` instead of `middleware.js`, `revalidateTag(tag, "max")` takes two arguments, async `headers()`).

## Commands (PowerShell, Windows)

```
npm run dev           # next dev --webpack (Turbopack crashes here; keep --webpack)
npm run build         # next build; run this to check a change compiles
npm run lint          # eslint . (10 existing problems as of 13 Oct 2026)
npm run start         # serve the production build
npm run db:generate   # after editing src/db/schema/*, then:
npm run db:migrate    # apply to Neon. Do not mix with db:push on the same database
npm run db:seed       # settings, nav, sections, hero, banners, coupons, 3 pitches, admin promotion
npm run db:studio
```

There are no tests. Verify with `npm run build` and by describing what to click in the browser.
Ask before running migrations or the seed against the database (it is a shared Neon instance).

## Layout

```
src/
  app/
    (site)/            public pages: /, /book, /bookings, /payment/*
    (auth)/            /login, /register
    admin/             CMS + booking admin (layout guards with requireRole)
    api/auth/[...all]  Better Auth handler
    api/booked-slots   live slot board JSON (no-store)
    api/payment/sslcommerz/[event]  SSLCommerz callbacks: success | fail | cancel | ipn (POST)
    api/cron/expire-holds           daily: re-check lost payments, expire holds (Bearer CRON_SECRET)
  components/
    ui/                Button, Dialog, Field, Inputs, Switch, Badge
    site/              public site chrome and home sections (props only)
    admin/             AdminShell, Kit, TonightBoard, StatusBadge, ImageUploader
    auth/              AuthForms, AuthLayout
  features/
    booking/           queries.js, actions.js, slots.js (pure slot engine), components/
    admin/             queries.js, actions/{pitches,bookings}.js, components/
    cms/               queries.js (cached reads), admin/ (editor UIs, still sample data)
    payment/           service.js (start, confirm, recheck), actions.js (payForBooking), result-page.js,
                       components/PaymentResult.jsx, RetryPayButton.jsx
  db/                  index.js (neon-http), pool.js (unused), schema/, seed.js
  lib/                 auth, auth-client, guards, action, time, utils, cache-tags, sslcommerz, env, sample data
  proxy.js             cookie check redirect for /admin, /bookings, /profile
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

**Time:** only `src/lib/time.js` (Asia/Dhaka, operating day starts 06:00, `DAY_START_HOUR`).
Never `new Date().getHours()` or `toLocaleDateString` on the server.

**Images the admin can set:** `<Image unoptimized={!canOptimize(src)} />`. Allowed remote hosts in
`next.config.mjs`: `images.unsplash.com`, `res.cloudinary.com`.

**Money:** BDT, integers, format with `taka()`; 12-hour times with `time12()` (`src/lib/utils.js`).

## Roles

`user.role`: `user` (player), `editor` (CMS content only), `admin` (everything). Grounds, bookings,
payments, users are admin only (`adminOnly` in `AdminShell`). Check the role inside every admin action,
not only in the layout. `/admin/{branding,navigation,coupons,payments,users}` pages don't call
`requireRole(["admin"])` yet (only hidden from editors in the menu); add it when wiring them.

## Known gaps (as of 13 Oct 2026)

- `Agents.md` refers to `BLUEPRINT.md`, which is not in the repo. `AI_CONTEXT.md` section 12 has the
  remaining plan (Steps 5 and 6); ask Said before assuming anything beyond it.
- `src/lib/env.js` is defined but not imported anywhere, and doesn't list the Cloudinary/SSLCommerz vars.
- `npm run lint` reports 8 errors and 2 warnings in existing code (`react-hooks/set-state-in-effect`,
  unescaped `'` in JSX).
- Admin content screens (branding, navigation, hero, banners, sections, footer, media), coupons, payments
  and users still use `sample-data.js` / `admin-sample-data.js`.
- `/profile` and `/terms` are linked from the navbar/footer but don't exist; "Show ticket" does nothing.
- Steps 1 to 4 and Step 2 (SSLCommerz) are done. Next: Step 5 (CMS write side + Cloudinary), then Step 6.

## End of session

Update `Agents.md` section 8 (Step plan) and section 10 (Changelog), plus any file tables that changed,
and `AI_CONTEXT.md` sections 3, 12 and 13.
Commit only when asked.