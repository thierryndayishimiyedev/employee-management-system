-- Attendance corrections: Accountant requests, Manager approves, then the
-- Accountant may update that one attendance record exactly once.
create table if not exists public.attendance_correction_requests (
  correction_request_id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance(attendance_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  manager_user_id uuid not null references public.users(user_id),
  requested_by uuid not null references public.users(user_id),
  reason text not null,
  status varchar(24) not null default 'PENDING_MANAGER'
    check (status in ('PENDING_MANAGER','APPROVED','REJECTED','USED')),
  manager_reviewed_by uuid references public.users(user_id),
  manager_reviewed_at timestamptz,
  manager_comments text,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_attendance_correction_scope
  on public.attendance_correction_requests(company_id, manager_user_id, status, created_at desc);
create unique index if not exists uq_open_attendance_correction_request
  on public.attendance_correction_requests(attendance_id)
  where status in ('PENDING_MANAGER', 'APPROVED');
