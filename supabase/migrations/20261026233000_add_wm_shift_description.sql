-- Shift creation payload includes a description field; older live schemas lacked it.
alter table public.wm_shifts
  add column if not exists description text not null default '';
