-- Report correction, custom-period, and manager-approved deletion workflow.
-- Run once in Supabase after the existing report migrations.

alter table public.reports
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_requested_by uuid references public.users(user_id) on delete set null,
  add column if not exists deletion_request_reason text,
  add column if not exists deletion_requested_from_status varchar(32),
  add column if not exists deletion_reviewed_at timestamptz,
  add column if not exists deletion_reviewed_by uuid references public.users(user_id) on delete set null,
  add column if not exists deletion_review_reason text;

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check check (status in (
  'DRAFT', 'PENDING_MANAGER', 'PENDING_OWNER', 'CHANGES_REQUESTED',
  'DELETE_REQUESTED', 'APPROVED'
));

alter table public.reports drop constraint if exists reports_report_type_check;
alter table public.reports add constraint reports_report_type_check
  check (report_type in ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'));

create index if not exists idx_reports_manager_deletion_review
  on public.reports(manager_user_id, status, deletion_requested_at desc);

-- Keep a deletion-requested report reserved until the Manager accepts or
-- declines it; this prevents a duplicate report for the same period.
drop index if exists public.uq_reports_company_accountant_type_period;
create unique index uq_reports_company_accountant_type_period
  on public.reports(company_id, accountant_id, report_type, period_start, period_end)
  where status in ('DRAFT', 'PENDING_MANAGER', 'PENDING_OWNER', 'CHANGES_REQUESTED', 'DELETE_REQUESTED', 'APPROVED');
