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
4. **Vercel → Project → Settings → Environment Variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public, used by the browser) and `SUPABASE_SERVICE_ROLE_KEY` (server-only, used by the IT Super Admin API to create head accounts). Use the **anon** key for `VITE_SUPABASE_ANON_KEY`, never `service_role`. Then redeploy and run `supabase/migration_department_heads_repair.sql` if `department_heads` predates this change.
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
  - Dedicated console strictly reserved for `diavlo3444@gmail.com`, verified server-side from the Supabase Auth access token and a row in `public.admins`.
  - Head Account Management uses the server-only `SUPABASE_SERVICE_ROLE_KEY` to create/invite real Supabase Auth users and write `public.department_heads`. It never runs in the browser.
  - Department and division assignment (`male`/`female` strictly enforced for Media & Press, Security, and Volunteers), instant portal suspension/reactivation, role editing, and password reset/invitation links.
  - If the Auth user is created but the database assignment fails, the real error and the Auth UID are shown. "Retry department assignment" reuses that UID; it never creates a second Auth user.
  - Head Portal (`/head`) authenticates with genuine Supabase Auth passwords. `.env.local` / Vercel values: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`. The old file-backed `HeadStore` and `/api/head-auth` login are local-development fallbacks only and are disabled on Vercel.
  - If you already ran an older `department_heads` migration, run `supabase/migration_department_heads_repair.sql` once. It only adds missing columns, backfills `user_id`, and keeps RLS enabled.

## Department workspaces (required one-time SQL)

Every head dashboard now has its own department workspace (tasks, campaigns, coverage, incidents, rosters, shifts, sponsor tasks, venue plans, run-of-show, directives, support tickets, …). All of it is stored in one shared table, `public.department_records`, and scoped by Row Level Security.

1. Open Supabase → SQL Editor → New query.
2. Paste the whole of `supabase/migration_department_workspaces.sql` and run it once. It is idempotent and additive: it never deletes or renames registration data and inserts no sample rows.
3. Reload `/head`. The SQL Editor prints `department_records exists: true` and the policy count at the end.

Until that file is run, workspaces show an explicit setup error instead of pretending to save. The migration also tightens `public.team_registrations` so that **only Media/Press, Security, and Volunteers heads** can read or update registrations; the other eight departments are blocked in PostgreSQL, not just in the sidebar.

## Weak points you still own

- **Public sign-ups off** (step 3). Strong unique password + MFA: there is no login rate limit beyond Supabase's own.
- **Admin identity is server-verified** on every request: a Supabase access token is checked with Supabase Auth and the caller must exist in `public.admins`. No email header, localStorage flag or password-shaped bearer token is accepted. The only super admin is the address in `SUPER_ADMIN_EMAIL` (server code).
- **Spam:** forms have a honeypot, DB length limits and a flood cap (20 registrations / 10 messages per minute site-wide). If spam appears, add Cloudflare Turnstile.
- **Deletes are permanent.** No audit log. Download the CSV regularly. Supabase free plan has no downloadable backups and pauses after about a week of inactivity.
- **Settings and published content are public.** Never put secrets or private notes there. Internal notes on applications/messages are private.
- **Retention promise:** the privacy draft says data is deleted within 12 months after the conference. You must actually do that (or edit the text).
- **Vercel Hobby** is for non-commercial use. A conference that charges fees may count as commercial.
- The Content-Security-Policy allows `https://*.supabase.co`. If you use a custom Supabase domain, add it to `vercel.json`.
- The Terms/Privacy texts are drafts, not legal advice.
