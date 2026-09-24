-- Monthly staff, owner-private staff, and planned night-shift support.
-- Run once in Supabase AFTER the existing attendance shift/rate migration.
-- This migration adds new ledgers only; it does not modify existing payroll,
-- worker, approval, payment, or manager-scope records.

create table if not exists public.monthly_staff (
  monthly_staff_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  owner_user_id uuid not null references public.users(user_id),
  linked_employee_id uuid references public.employees(employee_id) on delete set null,
  staff_type varchar(24) not null check (staff_type in ('ACCOUNTANT','SECURITY','OWNER_PRIVATE')),
  full_name varchar(160) not null,
  national_id varchar(32),
  momo_phone varchar(20) not null,
  monthly_salary numeric(14,2) not null check (monthly_salary > 0),
  daily_salary numeric(14,2) generated always as (round(monthly_salary / 30.0, 2)) stored,
  start_date date not null default current_date,
  is_active boolean not null default true,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, national_id),
  unique(company_id, momo_phone)
);

create table if not exists public.monthly_staff_payroll (
  monthly_staff_payroll_id uuid primary key default gen_random_uuid(),
  monthly_staff_id uuid not null references public.monthly_staff(monthly_staff_id) on delete restrict,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  payroll_month integer not null check (payroll_month between 1 and 12),
  payroll_year integer not null check (payroll_year >= 2000),
  gross_salary numeric(14,2) not null check (gross_salary >= 0),
  advance_deduction numeric(14,2) not null default 0 check (advance_deduction >= 0),
  net_salary numeric(14,2) not null check (net_salary >= 0),
  payment_status varchar(20) not null default 'GENERATED' check (payment_status in ('GENERATED','PAID','FAILED')),
  payment_reference varchar(120),
  payment_failure_reason text,
  paid_by uuid references public.users(user_id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(monthly_staff_id, payroll_month, payroll_year)
);

create table if not exists public.monthly_staff_advances (
  monthly_staff_advance_id uuid primary key default gen_random_uuid(),
  monthly_staff_id uuid not null references public.monthly_staff(monthly_staff_id) on delete restrict,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  request_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  status varchar(24) not null default 'PENDING_OWNER' check (status in ('PENDING_OWNER','OWNER_APPROVED','PAID','FAILED','REJECTED')),
  payment_reference varchar(120),
  payment_failure_reason text,
  paid_by uuid references public.users(user_id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- One owner-controlled plan per management unit.  A null manager is a
-- company-wide default.  The amount is added to (or subtracted from) the
-- worker's normal daily rate only for a recorded NIGHT attendance.
create table if not exists public.night_shift_settings (
  night_shift_setting_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  manager_user_id uuid references public.users(user_id) on delete cascade,
  starts_at time not null,
  ends_at time not null,
  fixed_worker_rate_adjustment numeric(14,2) not null default 0,
  flexible_worker_rate_adjustment numeric(14,2) not null default 0,
  is_active boolean not null default true,
  configured_by uuid not null references public.users(user_id),
  configured_at timestamptz not null default now(),
  check (starts_at <> ends_at)
);
create unique index if not exists uq_active_night_shift_per_manager
  on public.night_shift_settings(company_id, coalesce(manager_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_active = true;

-- Allow the same worker to have one DAY and one NIGHT attendance on one date.
-- Existing day-only rows remain unchanged.
alter table public.attendance drop constraint if exists attendance_employee_id_attendance_date_key;
-- Some older installations named this day-only rule differently.  Remove
-- both names before creating the DAY/NIGHT uniqueness rule below.
alter table public.attendance drop constraint if exists unique_employee_attendance;
drop index if exists public.attendance_employee_id_attendance_date_key;
drop index if exists public.unique_employee_attendance;
create unique index if not exists uq_attendance_employee_date_shift
  on public.attendance(employee_id, attendance_date, shift_type);

alter table public.flexible_work_entries
  add column if not exists shift_type varchar(16) not null default 'DAY';
alter table public.flexible_work_entries
  drop constraint if exists flexible_work_entries_shift_type_check;
alter table public.flexible_work_entries
  add constraint flexible_work_entries_shift_type_check check (shift_type in ('DAY', 'NIGHT'));
alter table public.flexible_work_entries
  drop constraint if exists flexible_work_entries_employee_id_work_date_key;
drop index if exists public.flexible_work_entries_employee_id_work_date_key;
create unique index if not exists uq_flexible_work_employee_date_shift
  on public.flexible_work_entries(employee_id, work_date, shift_type);

create index if not exists idx_monthly_staff_owner_scope
  on public.monthly_staff(company_id, owner_user_id, is_private, is_active);
create index if not exists idx_monthly_staff_payroll_period
  on public.monthly_staff_payroll(company_id, payroll_year, payroll_month);
