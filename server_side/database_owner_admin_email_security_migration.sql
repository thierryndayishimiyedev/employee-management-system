-- Email security is intentionally limited to Super Admin and Owner accounts.
-- Managers, Accountants, Suppliers, and other governed users keep the
-- existing Owner-managed password workflow and never receive public reset links.

create table if not exists public.password_reset_tokens (
  password_reset_token_id uuid primary key default gen_random_uuid(),
  account_type varchar(20) not null check (account_type in ('SUPER_ADMIN', 'OWNER')),
  admin_id uuid references public.admins(admin_id) on delete cascade,
  user_id uuid references public.users(user_id) on delete cascade,
  token_hash varchar(128) not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  requested_ip varchar(64),
  check ((account_type = 'SUPER_ADMIN' and admin_id is not null and user_id is null)
      or (account_type = 'OWNER' and user_id is not null and admin_id is null))
);
create index if not exists idx_password_reset_tokens_active
  on public.password_reset_tokens(token_hash, expires_at)
  where used_at is null;

-- This ledger makes scheduled daily, weekly, and monthly reports idempotent:
-- a deployment restart cannot email the same Owner/company/period twice.
create table if not exists public.owner_report_deliveries (
  owner_report_delivery_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  owner_user_id uuid not null references public.users(user_id) on delete cascade,
  report_type varchar(16) not null check (report_type in ('DAILY', 'WEEKLY', 'MONTHLY')),
  period_start date not null,
  period_end date not null,
  recipient_email varchar(254) not null,
  delivery_status varchar(16) not null default 'SENT' check (delivery_status in ('SENT', 'FAILED')),
  failure_reason text,
  sent_at timestamptz not null default now(),
  unique(company_id, owner_user_id, report_type, period_start, period_end)
);
