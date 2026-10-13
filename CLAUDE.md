# CLAUDE.md — TurfZone CMS

Turf-booking site + CMS for one venue in Dhaka (Next.js 16.4 App Router, React 19.3, Tailwind v4,
Drizzle + Neon Postgres, Better Auth, Zod 4). **JavaScript only, no TypeScript.**

@Agents.md

`Agents.md` (imported above) is the source of truth for progress, conventions, booking rules, file map
and the step plan. This file adds the working rules for Claude. If the two disagree, `Agents.md` wins;
fix the drift.

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
  components/
    ui/                Button, Dialog, Field, Inputs, Switch, Badge
    site/              public site chrome and home sections (props only)
    admin/             AdminShell, Kit, TonightBoard, StatusBadge, ImageUploader
    auth/              AuthForms, AuthLayout
  features/
    booking/           queries.js, actions.js, slots.js (pure slot engine), components/
    admin/             queries.js, actions/{pitches,bookings}.js, components/
    cms/               queries.js (cached reads), admin/ (editor UIs, still sample data)
    payment/           components/PaymentResult.jsx (Step 2 adds actions/confirm)
  db/                  index.js (neon-http), pool.js (WebSocket, transactions), schema/, seed.js
  lib/                 auth, auth-client, guards, action, time, utils, cache-tags, env, sample data
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

`src/lib/action.js` offers an `action(schema, roles, handler)` wrapper; existing actions write the
try/catch by hand. Either is fine, but never let an action throw to the client.

**Pages:** server component fetches, passes plain props to a client component. Add
`export const dynamic = "force-dynamic"` when it reads the session or live data. Wrap any client
component using `useSearchParams()` in `<Suspense>`.

**CMS reads:** `unstable_cache` + tag from `TAGS` in `src/lib/cache-tags.js`, with defaults if the
DB fails (see `src/features/cms/queries.js`). Writes in Step 5 must revalidate the same tag.

**Time:** only `src/lib/time.js` (Asia/Dhaka, operating day starts 06:00, `DAY_START_HOUR`).
Never `new Date().getHours()` or `toLocaleDateString` on the server.

**Images the admin can set:** `<Image unoptimized={!canOptimize(src)} />`. Allowed remote hosts in
`next.config.mjs`: `images.unsplash.com`, `res.cloudinary.com`.

**Money:** BDT, integers, format with `taka()`; 12-hour times with `time12()` (`src/lib/utils.js`).

## Roles

`user.role`: `user` (player), `editor` (CMS content only), `admin` (everything). Grounds, bookings,
payments, users are admin only (`adminOnly` in `AdminShell`). Check the role inside every admin action,
not only in the layout.

## Known gaps (as of 13 Oct 2026)

- `Agents.md` refers to `BLUEPRINT.md`, which is not in the repo yet. Ask Said before assuming what
  the blueprint says.
- `src/lib/env.js` is defined but not imported anywhere, and doesn't list the Cloudinary/SSLCommerz vars
  that `.env.example` has.
- `npm run lint` reports 8 errors and 2 warnings in existing code (`react-hooks/set-state-in-effect`,
  unescaped `'` in JSX).
- `/payment/*`, admin content screens (branding, navigation, hero, banners, sections, footer, media),
  coupons, payments and users still use `sample-data.js` / `admin-sample-data.js`.
- Next: Step 2 (SSLCommerz), then Step 5 (CMS write side). Details in `Agents.md` section 8.

## End of session

Update `Agents.md` section 8 (Step plan) and section 10 (Changelog), plus any file tables that changed.
Commit only when asked.
