alter table public.wm_qr_passes add column if not exists reporting_head_id uuid;
create index if not exists wm_qr_passes_reporting_head_id_idx on public.wm_qr_passes (reporting_head_id) where reporting_head_id is not null;
comment on column public.wm_qr_passes.reporting_head_id is 'Department head record ID the Co-Head reports to; validated against active department_heads on signup.';
