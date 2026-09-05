-- Flexible/casual worker ledger. Run once in Supabase.
alter table public.employees add column if not exists payment_type varchar(20) not null default 'FIXED_DAILY'
  check (payment_type in ('FIXED_DAILY','FLEXIBLE_DAILY'));
create table if not exists public.flexible_work_entries (
  flexible_work_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  manager_user_id uuid not null references public.users(user_id),
  employee_id uuid not null references public.employees(employee_id) on delete cascade,
  work_date date not null,
  agreed_daily_rate numeric(14,2) not null check (agreed_daily_rate > 0),
  work_details text,
  recorded_by uuid references public.users(user_id),
  payroll_id uuid references public.payroll(payroll_id),
  created_at timestamptz not null default now(),
  unique(employee_id, work_date)
);
create index if not exists idx_flexible_work_scope_date on public.flexible_work_entries(company_id, manager_user_id, work_date);
