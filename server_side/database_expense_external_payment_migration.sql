-- Allows an expense/material purchase to be recorded when it was paid outside
-- the application (cash, bank transfer, supplier account, etc.).
-- Run once in the Supabase SQL editor before using "Already paid externally".

alter table public.operational_expenses
  add column if not exists payment_method varchar(32) not null default 'SYSTEM_MOMO',
  add column if not exists external_payment_reference varchar(160),
  add column if not exists external_paid_at timestamptz;

-- External/cash purchases may have no MTN recipient number. System-MoMo
-- purchases are still validated by the server and require a valid MTN number.
alter table public.operational_expenses
  alter column buyer_phone drop not null;

alter table public.operational_expenses
  drop constraint if exists operational_expenses_payment_method_check;
alter table public.operational_expenses
  add constraint operational_expenses_payment_method_check
  check (payment_method in ('SYSTEM_MOMO', 'EXTERNAL_RECORDED'));

create index if not exists idx_operational_expenses_payment_method
  on public.operational_expenses(company_id, manager_user_id, payment_method, expense_date desc);
