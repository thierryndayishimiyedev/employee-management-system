-- Owner-controlled work calendar. Run once in Supabase.
-- Defaults preserve the existing workflow: Sunday is not worked and a normal
-- daily rate represents 10 hours. The Owner may enable Sunday work later.
create table if not exists public.company_work_settings (
  company_id uuid primary key references public.companies(company_id) on delete cascade,
  sunday_work_allowed boolean not null default false,
  standard_day_hours numeric(5,2) not null default 10 check (standard_day_hours > 0 and standard_day_hours <= 24),
  updated_by uuid references public.users(user_id),
  updated_at timestamptz not null default now()
);
