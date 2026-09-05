-- Operational expenses and material purchasing workflow.
-- Run once in the Supabase SQL editor before using the Expenses page.

create table if not exists public.operational_expenses (
    expense_id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(company_id) on delete cascade,
    manager_user_id uuid not null references public.users(user_id),
    expense_date date not null default current_date,
    expense_category varchar(24) not null default 'OTHER',
    item_name varchar(160) not null,
    quantity numeric(12,2) not null default 1 check (quantity > 0),
    unit varchar(32) not null default 'item',
    unit_price numeric(14,2) not null check (unit_price >= 0),
    total_amount numeric(14,2) not null check (total_amount >= 0),
    buyer_role varchar(20) not null default 'OTHER',
    buyer_name varchar(160) not null,
    buyer_phone varchar(20) not null,
    notes text,
    recorded_by uuid references public.users(user_id),
    approval_status varchar(32) not null default 'PENDING_MANAGER',
    manager_approved_by uuid references public.users(user_id),
    manager_approved_at timestamptz,
    manager_comments text,
    owner_approved_by uuid references public.users(user_id),
    owner_approved_at timestamptz,
    owner_comments text,
    payment_status varchar(20) not null default 'UNPAID',
    payment_reference varchar(120),
    payment_provider varchar(60),
    paid_by uuid references public.users(user_id),
    paid_at timestamptz,
    payment_failure_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint operational_expenses_category_check check (expense_category in ('MATERIAL','EQUIPMENT','FUEL','TOOL','OTHER')),
    constraint operational_expenses_buyer_role_check check (buyer_role in ('OWNER','MANAGER','ACCOUNTANT','OTHER')),
    constraint operational_expenses_approval_check check (approval_status in ('PENDING_MANAGER','PENDING_OWNER','OWNER_APPROVED','CHANGES_REQUESTED')),
    constraint operational_expenses_payment_check check (payment_status in ('UNPAID','PAID','FAILED'))
);

create table if not exists public.operational_expense_payments (
    expense_payment_id uuid primary key default gen_random_uuid(),
    expense_id uuid not null unique references public.operational_expenses(expense_id) on delete cascade,
    company_id uuid not null references public.companies(company_id) on delete cascade,
    manager_user_id uuid not null references public.users(user_id),
    amount numeric(14,2) not null check (amount >= 0),
    receiver_name varchar(160) not null,
    receiver_phone varchar(20) not null,
    payment_status varchar(20) not null,
    provider_name varchar(60),
    transaction_reference varchar(120),
    provider_response jsonb,
    paid_by uuid references public.users(user_id),
    paid_at timestamptz not null default now()
);

create index if not exists idx_operational_expenses_scope_date
    on public.operational_expenses(company_id, manager_user_id, expense_date desc);
create index if not exists idx_operational_expenses_approval
    on public.operational_expenses(approval_status, payment_status);
