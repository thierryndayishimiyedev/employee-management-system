-- Flexible workers are paid through their own weekly payroll cycle.
-- Run once in the Supabase SQL editor before using Flexible Weekly Payroll.
alter table public.payroll drop constraint if exists payroll_frequency_check;
alter table public.payroll drop constraint if exists payroll_payroll_frequency_check;
alter table public.payroll
  add constraint payroll_frequency_check
  check (payroll_frequency in ('MONTHLY', 'BIWEEKLY', 'WEEKLY'));

create unique index if not exists uq_payroll_employee_weekly_period
  on public.payroll(employee_id, payroll_period_start, payroll_period_end)
  where payroll_frequency = 'WEEKLY'
    and payroll_period_start is not null
    and payroll_period_end is not null;
