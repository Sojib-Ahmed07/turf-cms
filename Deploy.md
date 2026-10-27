# DEPLOY.md: putting TurfZone CMS live on Vercel

Follow the steps in order. Each step says where to click and what to paste. Total time is about an hour,
plus however long SSLCommerz takes to approve the live store (usually a few working days, so apply early).

You need: the code on GitHub, a Vercel account, the Neon account, the domain (for example
`kickoffarena.com.bd`) and access to its DNS settings.

---

## 1. Make a separate live database (Neon)

Keep the live site's data apart from your test data.

1. Neon dashboard, your project, **Branches**, **Create branch**. Name it `production`, branch from `main`.
   (Or create a brand-new Neon project if you want a clean start.)
2. Open the new branch, **Connection details**, choose **Pooled connection**, copy the string.
   This is the live `DATABASE_URL`. Keep it somewhere safe; don't commit it.

## 2. Create the tables and the starting content

Run this on your PC in PowerShell, inside `D:\projects\turf-cms`. The values you set with `$env:` win over
`.env.local` for this window only, so your local setup stays as it is.

```powershell
$env:DATABASE_URL = "postgresql://...the live pooled string..."
$env:SEED_ADMIN_EMAIL = "the-owner@email.com"
npm run db:migrate
npm run db:seed
```

Leave this PowerShell window open; you need it again in step 7. When you're completely done, close it (or
run `Remove-Item Env:DATABASE_URL, Env:SEED_ADMIN_EMAIL`) so you don't seed the live database by accident later.

## 3. Generate the secrets

Run each line once and copy the output. Use a different value for each.

```powershell
npx @better-auth/cli secret          # -> BETTER_AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"   # -> CRON_SECRET
```

## 4. Create the Vercel project

1. vercel.com, **Add New**, **Project**, import the GitHub repo.
2. Framework preset: Next.js (detected). Leave build and output settings as they are.
3. Before clicking Deploy, open **Environment Variables** and add everything in the table below
   (environment: **Production**; also tick Preview if you use preview deployments).

| Name | Value |
|---|---|
| `APP_URL` | `https://yourdomain.com` (no slash at the end) |
| `BETTER_AUTH_URL` | the same as `APP_URL` |
| `BETTER_AUTH_SECRET` | from step 3 |
| `DATABASE_URL` | the live pooled string from step 1 |
| `CRON_SECRET` | from step 3 |
| `SSLCZ_STORE_ID`, `SSLCZ_STORE_PASSWORD` | sandbox values for now (step 8 switches to live) |
| `SSLCZ_IS_LIVE` | `false` for now |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from the Cloudinary dashboard (Settings, API Keys) |
| `CLOUDINARY_FOLDER` | optional; leave it out to use `turfzone` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional, see step 6 |

Never add `SSLCZ_API_BASE` or `CLOUDINARY_API_BASE`: they exist only for local tests, and the live server
refuses to start if they're set.

4. Click **Deploy**.

The server checks these values when it starts. If something required is missing or wrong, the deploy's
**Logs** tab shows a clear list starting with `[env]` (names only, never the values). Fix the value in
Settings, Environment Variables, then **Deployments**, the latest one, **Redeploy**.

## 5. Connect the domain

1. Vercel project, **Settings**, **Domains**, add `yourdomain.com` and `www.yourdomain.com`.
2. Add the DNS records Vercel shows at your domain registrar. Set `www` to redirect to the bare domain
   (or the other way round), so there's only one address. It must be exactly the one in `APP_URL`.
3. Wait until both show a green tick (HTTPS is set up automatically).

If you change the domain later, update `APP_URL` and `BETTER_AUTH_URL` and redeploy.

## 6. Google sign-in (optional)

1. Google Cloud Console, **APIs & Services**, **Credentials**, your OAuth client (or create a "Web application" one).
2. **Authorised JavaScript origins**: `https://yourdomain.com`
3. **Authorised redirect URIs**: `https://yourdomain.com/api/auth/callback/google`
4. Copy the client ID and secret into Vercel and redeploy. Without both, the Google button stays hidden.

## 7. Make the owner an admin

1. On the live site, register with the email you used for `SEED_ADMIN_EMAIL` in step 2.
2. In the same PowerShell window as step 2, run `npm run db:seed` again. The seed is safe to repeat; it only
   fills in missing content and promotes that email to admin.
3. Sign out and in again, then open `https://yourdomain.com/admin`.
4. Other staff: they register on the site, then the admin changes their role in **Admin, Users**.

## 8. Go live with SSLCommerz

Apply for a live store at sslcommerz.com (trade licence, NID, bank details). When approved:

1. **Merchant panel**, your store's settings:
   - Registered domain / website: `https://yourdomain.com`
   - **IPN URL**: `https://yourdomain.com/api/payment/sslcommerz/ipn` (enable IPN)
2. In Vercel set `SSLCZ_STORE_ID` and `SSLCZ_STORE_PASSWORD` to the **live** values and `SSLCZ_IS_LIVE` to `true`.
   Redeploy.
3. Test with a small real payment (book a cheap slot, pay with bKash). Check:
   - the success page shows the ticket;
   - **Admin, Payments** shows the payment as Paid;
   - the merchant panel shows the same transaction.
   Then cancel that booking in **Admin, Bookings** and refund it from the merchant panel.

Refunds stay manual: send the money from the merchant panel (or by bKash/cash), then press **Mark refunded**
in the admin. The SSLCommerz refund API needs a fixed server IP, which Vercel doesn't have.

## 9. The cleanup job (cron)

`vercel.json` already runs `/api/cron/expire-holds` once a day at 3 am Dhaka. Vercel sends `CRON_SECRET`
automatically. Check it in Vercel, **Settings**, **Cron Jobs** after the first deploy.

**Required, not optional:** the job is also how a payment gets confirmed when the player paid but the
answer never reached us (closed tab, lost IPN, bKash timing out). It re-checks payments started 5 to 120
minutes ago on every run, and ones still open up to 48 hours about once an hour. bKash has no IPN, so
without a frequent run a paid bKash booking can expire and its slot be sold again. Vercel Hobby only
allows the daily run, so add a free external cron that calls it every 10 minutes:

1. cron-job.org, create an account, **Create cronjob**.
2. URL: `https://yourdomain.com/api/cron/expire-holds`, every 10 minutes.
3. **Advanced**, **Headers**: `Authorization` = `Bearer <your CRON_SECRET>`.
4. Save, then **Test run**: the response should be `{"ok":true,...}`. `Unauthorized` means the header is wrong.

(With the IPN URL set in step 8, most of these payments are confirmed anyway; the cron is the safety net.)

## 10. Final checks

- [ ] Home page shows the logo, slides and grounds; `/terms` shows your booking terms (edit them in **Admin, Booking terms**).
- [ ] Register a test player, book a slot, pay, see the ticket in **My bookings, Show ticket**.
- [ ] **Admin, Payments** lists the payment; **Admin, Bookings** shows the booking.
- [ ] Upload an image in **Admin, Media** (checks Cloudinary).
- [ ] `https://yourdomain.com/robots.txt` and `/sitemap.xml` show your domain, not localhost.
- [ ] Search Console (optional): add the domain and submit `https://yourdomain.com/sitemap.xml`.
- [ ] Vercel **Logs**: no `[env]` errors; warnings only for features you chose not to use.

## When something goes wrong

| Symptom | Fix |
|---|---|
| Every page shows "Something went wrong" right after deploy | Vercel **Logs**: look for `[env]`. Fix that variable and redeploy |
| Sign-in works locally but not live | `BETTER_AUTH_URL` / `APP_URL` don't match the address in the browser (www vs bare domain, http vs https) |
| Google sign-in: "redirect_uri_mismatch" | The redirect URI in Google Cloud must be exactly `https://yourdomain.com/api/auth/callback/google` |
| Pay button missing | `SSLCZ_STORE_ID` / `SSLCZ_STORE_PASSWORD` not set in Vercel, or not redeployed after adding them |
| Paid but booking still "awaiting payment" | Admin, Payments, **Check with SSLCommerz** on that row. Then check the IPN URL in the merchant panel |
| "Image uploads aren't set up yet" | Cloudinary variables missing in Vercel; redeploy after adding |
| Cron shows 401 | The `Authorization` header must be `Bearer ` + the exact `CRON_SECRET` |
| Changed a variable but nothing changed | Variables apply on the next deploy: **Redeploy** |