-- Additive migration for biweekly payroll periods.
-- REVIEW BEFORE RUNNING IN SUPABASE. It does not drop or rewrite existing data.
-- Existing monthly payroll rows remain valid and retain NULL period dates.

alter table if exists payroll
    add column if not exists payroll_period_start date,
    add column if not exists payroll_period_end date,
    add column if not exists payroll_frequency text not null default 'MONTHLY';

alter table if exists payroll
    drop constraint if exists payroll_period_dates_check;

alter table if exists payroll
    add constraint payroll_period_dates_check
    check (
        (payroll_period_start is null and payroll_period_end is null)
        or (payroll_period_start is not null and payroll_period_end is not null
            and payroll_period_end >= payroll_period_start)
    );

alter table if exists payroll
    drop constraint if exists payroll_frequency_check;

alter table if exists payroll
    add constraint payroll_frequency_check
    check (payroll_frequency in ('MONTHLY', 'BIWEEKLY'));

-- One employee can have one payroll per explicit biweekly interval. The WHERE
-- clause preserves all legacy monthly rows and permits their current uniqueness.
create unique index if not exists uq_payroll_employee_biweekly_period
    on payroll(employee_id, payroll_period_start, payroll_period_end)
    where payroll_frequency = 'BIWEEKLY'
      and payroll_period_start is not null
      and payroll_period_end is not null;

create index if not exists idx_payroll_company_period
    on payroll(company_id, payroll_period_start, payroll_period_end);
