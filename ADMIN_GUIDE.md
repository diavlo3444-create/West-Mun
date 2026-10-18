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

- **Dashboard:** Real-time conference overview with total registrations, pending review counters, approved candidates, team breakdown metrics, 14-day velocity timeline chart, and recent application feed.
- **Registrations:** Complete delegate and staff registry. Search by name, email, school, application ID; filter by category (Delegates, Security, Media, Volunteers) and status (Pending, Approved, Rejected, Waitlisted, Withdrawn); date range filters; sorting; pagination; applicant dossier review modal with 1-click Approve / Reject, private internal notes, and confirmation dialogs; CSV export.
- **Team Management:** Independent registration controls for Security, Media, Volunteers, and Delegates. Toggle registration Open or Closed per team. Server triggers in PostgreSQL (`team_registrations_guard` and `delegates_guard`) reject direct API submissions when closed.
- **Statistics & Reports:** Visual analytics, approval/rejection ratios, team distribution progress bars, submission velocity charts, and CSV report downloads.
- **Settings → Registration:** Master switches for delegate & team registration, fee schedules, and registration windows.
- **Messages:** Contact form inquiries.
- **Website content:** Announcements, secretariat dais, committees, schedule, FAQ, documents, sponsors.
- **Team Management Migration:** If you are using team registrations for the first time, run `supabase/migration_team_management.sql` in Supabase > SQL Editor > New query.
- Add/remove organisers: add a user in Supabase, run `make_admin.sql` with their email. Remove: `delete from public.admins where lower(email)=lower('their@email');`
- **IT Super Admin Dashboard (`/admin` → IT Super Admin):**
  - Dedicated master console strictly reserved for `diavlo3444@gmail.com` when authenticated and verified in `public.admins`.
  - Enables direct provisioning of Department Head accounts with secure temporary passwords, automatic rollback on error, role editing, instant portal access suspension, and password reset workflows.
  - To enable:
    1. Run `supabase/migration_super_admin.sql` in Supabase > SQL Editor.
    2. Add `diavlo3444@gmail.com` into `public.admins` using the script in `supabase/migration_super_admin.sql`.
    3. In Vercel (or production server environment variables), add `SUPABASE_SERVICE_ROLE_KEY` to allow serverless user provisioning.

## Weak points you still own

- **Public sign-ups off** (step 3). Strong unique password + MFA: there is no login rate limit beyond Supabase's own.
- **Spam:** forms have a honeypot, DB length limits and a flood cap (20 registrations / 10 messages per minute site-wide). If spam appears, add Cloudflare Turnstile.
- **Deletes are permanent.** No audit log. Download the CSV regularly. Supabase free plan has no downloadable backups and pauses after about a week of inactivity.
- **Settings and published content are public.** Never put secrets or private notes there. Internal notes on applications/messages are private.
- **Retention promise:** the privacy draft says data is deleted within 12 months after the conference. You must actually do that (or edit the text).
- **Vercel Hobby** is for non-commercial use. A conference that charges fees may count as commercial.
- The Content-Security-Policy allows `https://*.supabase.co`. If you use a custom Supabase domain, add it to `vercel.json`.
- The Terms/Privacy texts are drafts, not legal advice.
