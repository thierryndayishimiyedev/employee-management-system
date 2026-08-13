-- REQUIRED follow-up for biweekly payrolls.
-- The live legacy constraint `unique_payroll` enforces employee/month/year and
-- blocks the second 14-day period. This replaces it with two safe partial
-- unique indexes. No payroll rows are deleted or changed.

alter table payroll
    drop constraint if exists unique_payroll;

create unique index if not exists uq_payroll_employee_monthly_period
    on payroll(employee_id, payroll_month, payroll_year)
    where payroll_frequency = 'MONTHLY';

create unique index if not exists uq_payroll_employee_biweekly_period
    on payroll(employee_id, payroll_period_start, payroll_period_end)
    where payroll_frequency = 'BIWEEKLY'
      and payroll_period_start is not null
      and payroll_period_end is not null;
