# WEST MUN — admin panel & security guide

## What changed (October 2026)

- **Removed** the Express server (`server.ts`). It kept applications in a JSON file, which is lost on every redeploy and cannot run on Vercel at all, and it fell back to the admin password `masterkey` when `ADMIN_PASSWORD` was not set. The old hidden `Ctrl+Shift+A` admin popup and `window.openAdminPortal` are gone too.
- **Database:** Supabase (Postgres) with Row Level Security. The rules live in `supabase/schema.sql`, not in website code.
- **Admin panel** at `/admin` (own code chunk, `noindex`, 30-minute idle sign-out).
- **Public site** now reads committees, secretariat, schedule, FAQ, documents, sponsors, announcements and settings from the database. If the database is unreachable it shows the built-in defaults.
- **Legal:** `/terms` and `/privacy`, linked from the footer; consent checkbox on the registration and contact forms; age/permission confirmation on registration; "not affiliated with the UN" disclaimer.
- **Security headers** (CSP without `unsafe-inline`/`unsafe-eval` for scripts, `frame-ancestors 'none'`, HSTS, nosniff…) in `vercel.json`.
- Fonts are bundled (no Google Fonts / onlinewebfonts requests). The unused Helvetica Now links were removed (commercial font, unclear licence).

## One-time setup

1. **Supabase:** create a project. SQL Editor → New query → run, in this order: `supabase/schema.sql`, `supabase/seed.sql`.
2. **Authentication → Users → Add user** (email + password, tick *Auto Confirm User*). Then put that email into `supabase/make_admin.sql` and run it.
3. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". Turn on MFA if your plan offers it.
4. **Vercel → Project → Settings → Environment Variables:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API; use the **anon** key, never `service_role`). Redeploy.
5. Open `https://YOUR-SITE/admin`, sign in, go to **Settings** and fill in: organiser name, governing country, contact email, legal version.
6. **Have a lawyer read `/terms` and `/privacy`** before real registrations. Paste the final text into Settings → Legal (no redeploy needed) and change the legal version date.

Local development: copy `.env.example` to `.env.local`, fill both values, `npm install`, `npm run dev`.

## Everyday use

- **Settings → Registration:** tick "Registration is open", set fees and optional opening/closing dates. The database enforces them (a hand-made request cannot register outside the window, mark itself accepted, or pay a different fee).
- **Applications:** filter/search, change status and payment, add private notes, delete, download CSV. Status changes do **not** email anyone.
- **Messages:** contact-form messages. Reply from your own email.
- **Website content:** announcements, secretariat, committees, schedule (days, then sessions), FAQ, documents (PDF/image upload), sponsors. Untick "Published" to hide without deleting. Documents, sponsors and announcements stay hidden on the website until you add the first item.
- Add/remove organisers: add a user in Supabase, run `make_admin.sql` with their email. Remove: `delete from public.admins where lower(email)=lower('their@email');`

## Weak points you still own

- **Public sign-ups off** (step 3). Strong unique password + MFA: there is no login rate limit beyond Supabase's own.
- **Spam:** forms have a honeypot, DB length limits and a flood cap (20 registrations / 10 messages per minute site-wide). If spam appears, add Cloudflare Turnstile.
- **Deletes are permanent.** No audit log. Download the CSV regularly. Supabase free plan has no downloadable backups and pauses after about a week of inactivity.
- **Settings and published content are public.** Never put secrets or private notes there. Internal notes on applications/messages are private.
- **Retention promise:** the privacy draft says data is deleted within 12 months after the conference. You must actually do that (or edit the text).
- **Vercel Hobby** is for non-commercial use. A conference that charges fees may count as commercial.
- The Content-Security-Policy allows `https://*.supabase.co`. If you use a custom Supabase domain, add it to `vercel.json`.
- The Terms/Privacy texts are drafts, not legal advice.
