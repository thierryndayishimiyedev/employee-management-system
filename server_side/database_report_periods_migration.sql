-- Safe additive metadata for automatic daily/weekly/monthly/yearly reports.
-- Existing reports remain valid as DAILY reports with report_date as their period.

alter table reports
    add column if not exists report_type text not null default 'DAILY',
    add column if not exists period_start date,
    add column if not exists period_end date,
    add column if not exists snapshot_generated_at timestamptz;

update reports
set period_start = coalesce(period_start, report_date),
    period_end = coalesce(period_end, report_date)
where period_start is null or period_end is null;

alter table reports
    drop constraint if exists reports_report_type_check;

alter table reports
    add constraint reports_report_type_check
    check (report_type in ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'));

alter table reports
    drop constraint if exists reports_period_dates_check;

alter table reports
    add constraint reports_period_dates_check
    check (period_start is not null and period_end is not null and period_end >= period_start);

create index if not exists idx_reports_company_type_period
    on reports(company_id, report_type, period_start, period_end);

create unique index if not exists uq_reports_company_accountant_type_period
    on reports(company_id, accountant_id, report_type, period_start, period_end)
    where status in ('DRAFT', 'PENDING_MANAGER', 'PENDING_OWNER', 'CHANGES_REQUESTED', 'APPROVED');
