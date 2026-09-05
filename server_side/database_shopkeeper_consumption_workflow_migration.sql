-- Manager-scoped shopkeepers and approval/payment workflow for worker items.
create table if not exists shopkeepers (
    shopkeeper_id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(company_id) on delete restrict,
    manager_user_id uuid not null references users(user_id) on delete restrict,
    shopkeeper_name text not null,
    phone varchar(30) not null,
    active boolean not null default true,
    created_by uuid references users(user_id) on delete set null,
    created_at timestamptz not null default now()
);
create index if not exists idx_shopkeepers_company_manager on shopkeepers(company_id, manager_user_id, active);

alter table worker_consumptions add column if not exists shopkeeper_id uuid references shopkeepers(shopkeeper_id) on delete restrict;
alter table worker_consumptions add column if not exists approval_status text not null default 'PENDING_MANAGER'
    check (approval_status in ('PENDING_MANAGER','PENDING_OWNER','CHANGES_REQUESTED','OWNER_APPROVED','PAID'));
alter table worker_consumptions add column if not exists manager_approved_by uuid references users(user_id) on delete set null;
alter table worker_consumptions add column if not exists manager_approved_at timestamptz;
alter table worker_consumptions add column if not exists owner_approved_by uuid references users(user_id) on delete set null;
alter table worker_consumptions add column if not exists owner_approved_at timestamptz;
alter table worker_consumptions add column if not exists approval_comments text;
alter table worker_consumptions add column if not exists shopkeeper_payment_status text not null default 'UNPAID'
    check (shopkeeper_payment_status in ('UNPAID','PAID','FAILED'));
alter table worker_consumptions add column if not exists shopkeeper_payment_reference text;
alter table worker_consumptions add column if not exists paid_at timestamptz;

create table if not exists shopkeeper_payments (
    shopkeeper_payment_id uuid primary key default gen_random_uuid(),
    consumption_id uuid not null unique references worker_consumptions(consumption_id) on delete restrict,
    shopkeeper_id uuid not null references shopkeepers(shopkeeper_id) on delete restrict,
    company_id uuid not null references companies(company_id) on delete restrict,
    amount numeric(14,2) not null check (amount > 0),
    payment_status text not null check (payment_status in ('PAID','FAILED')),
    provider_name text not null default 'INTERNAL_TEST',
    transaction_reference text,
    provider_response jsonb,
    paid_by uuid references users(user_id) on delete set null,
    paid_at timestamptz,
    created_at timestamptz not null default now()
);
create index if not exists idx_shopkeeper_payments_company on shopkeeper_payments(company_id, payment_status);
