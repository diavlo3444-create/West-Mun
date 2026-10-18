-- =====================================================================
-- WEST MUN — make a Supabase user an organiser (admin)
--
-- 1. In Supabase: Authentication > Users > Add user (email + password,
--    tick "Auto Confirm User"). Do this first.
-- 2. Replace PUT-THE-EMAIL-HERE@example.com below with that same email.
-- 3. Run this in SQL Editor > New query.
--
-- The last line shows every organiser. If your email is not listed, the
-- user does not exist yet (step 1) or the email was typed differently.
--
-- To REMOVE an organiser:
--   delete from public.admins where lower(email) = lower('their@email');
-- =====================================================================

insert into public.admins (user_id, email)
select id, email
from auth.users
where lower(email) = lower('PUT-THE-EMAIL-HERE@example.com')
on conflict (user_id) do nothing;

select email, created_at from public.admins order by created_at;
