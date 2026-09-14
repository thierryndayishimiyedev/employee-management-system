-- Owner-direct workers / personal deal payments.
-- These people are intentionally separate from employees, attendance, payroll,
-- advances, and manager/accountant operations. Only the company Owner may
-- create and pay them.

create table if not exists public.owner_direct_workers (
  direct_worker_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  owner_user_id uuid not null references public.users(user_id) on delete restrict,
  full_name varchar(160) not null,
  national_id varchar(32) not null,
  momo_phone varchar(20) not null,
  agreement_date date not null default current_date,
  agreed_amount numeric(14,2) not null check (agreed_amount > 0),
  work_description text,
  payment_status varchar(20) not null default 'UNPAID' check (payment_status in ('UNPAID', 'PAID', 'FAILED')),
  payment_reference varchar(120),
  payment_provider varchar(60),
  payment_failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, national_id, agreement_date)
);

create table if not exists public.owner_direct_worker_payments (
  direct_worker_payment_id uuid primary key default gen_random_uuid(),
  direct_worker_id uuid not null unique references public.owner_direct_workers(direct_worker_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  receiver_name varchar(160) not null,
  receiver_phone varchar(20) not null,
  payment_status varchar(20) not null,
  provider_name varchar(60),
  transaction_reference varchar(120),
  provider_response jsonb,
  paid_by uuid references public.users(user_id),
  paid_at timestamptz not null default now()
);

create index if not exists idx_owner_direct_workers_company_status_date
  on public.owner_direct_workers(company_id, owner_user_id, payment_status, agreement_date desc);
