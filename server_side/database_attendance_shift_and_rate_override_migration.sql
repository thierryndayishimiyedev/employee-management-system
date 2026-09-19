-- Attendance shift and daily-rate override support.
-- Run once in Supabase before using Night shift or a reduced daily rate.
-- A rate override belongs to one attendance day only; it never changes the
-- worker's normal employees.daily_rate.

alter table public.attendance
  add column if not exists shift_type varchar(16) not null default 'DAY',
  add column if not exists applied_daily_rate numeric(14,2),
  add column if not exists rate_adjustment_reason text;

alter table public.attendance
  drop constraint if exists attendance_shift_type_check;
alter table public.attendance
  add constraint attendance_shift_type_check
  check (shift_type in ('DAY', 'NIGHT'));

alter table public.attendance
  drop constraint if exists attendance_applied_daily_rate_check;
alter table public.attendance
  add constraint attendance_applied_daily_rate_check
  check (applied_daily_rate is null or applied_daily_rate >= 0);

create index if not exists idx_attendance_scope_shift_date
  on public.attendance(company_id, manager_user_id, shift_type, attendance_date desc);
