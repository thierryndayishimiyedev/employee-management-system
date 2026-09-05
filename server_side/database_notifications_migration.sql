-- Owner/manager operational notifications. Safe to run again.
create table if not exists public.operational_notifications (
  notification_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  manager_user_id uuid not null references public.users(user_id) on delete cascade,
  sender_user_id uuid not null references public.users(user_id),
  recipient_user_id uuid not null references public.users(user_id),
  subject varchar(160) not null,
  message text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_operational_notifications_recipient on public.operational_notifications(recipient_user_id, is_read, created_at desc);
