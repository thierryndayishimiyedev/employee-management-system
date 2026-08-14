-- Safe additive migration: food-supply approval/payment and worker consumable
-- deductions.  It creates new records only and does not delete or rewrite data.

-- A supplier must be able to sign in without pretending to be a payroll worker.
alter table users
    alter column employee_id drop not null;

insert into roles (role_name, description)
select 'FOOD_SUPPLIER', 'Records food supplied to a company camp for manager verification.'
where not exists (select 1 from roles where role_name = 'FOOD_SUPPLIER');

create table if not exists food_suppliers (
    supplier_id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references users(user_id) on delete restrict,
    company_id uuid not null references companies(company_id) on delete restrict,
    supplier_name text not null,
    phone varchar(30),
    email varchar(254),
    created_by uuid references users(user_id) on delete set null,
    created_at timestamptz not null default now(),
    active boolean not null default true
);
create index if not exists idx_food_suppliers_company on food_suppliers(company_id);

create table if not exists food_supplies (
    food_supply_id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(company_id) on delete restrict,
    supplier_id uuid not null references food_suppliers(supplier_id) on delete restrict,
    supply_date date not null,
    notes text,
    status text not null default 'PENDING_MANAGER'
        check (status in ('DRAFT','PENDING_MANAGER','PENDING_OWNER','CHANGES_REQUESTED','OWNER_APPROVED','PAID')),
    manager_approved_by uuid references users(user_id) on delete set null,
    manager_approved_at timestamptz,
    manager_comments text,
    owner_approved_by uuid references users(user_id) on delete set null,
    owner_approved_at timestamptz,
    owner_comments text,
    payment_status text not null default 'UNPAID'
        check (payment_status in ('UNPAID','PAID','FAILED')),
    payment_reference text,
    payment_provider text,
    paid_by uuid references users(user_id) on delete set null,
    paid_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists idx_food_supplies_company_status_date
    on food_supplies(company_id, status, supply_date desc);
create index if not exists idx_food_supplies_supplier_date
    on food_supplies(supplier_id, supply_date desc);

create table if not exists food_supply_items (
    food_supply_item_id uuid primary key default gen_random_uuid(),
    food_supply_id uuid not null references food_supplies(food_supply_id) on delete cascade,
    food_name text not null,
    quantity numeric(14,2) not null check (quantity > 0),
    unit text not null default 'unit',
    unit_price numeric(14,2) not null check (unit_price >= 0),
    created_at timestamptz not null default now()
);
create index if not exists idx_food_supply_items_supply on food_supply_items(food_supply_id);

-- Existing payroll payments require payroll_id, so food payments use their own
-- immutable payment ledger.  The unique key is the one-time-payment guard.
create table if not exists food_supply_payments (
    food_supply_payment_id uuid primary key default gen_random_uuid(),
    food_supply_id uuid not null unique references food_supplies(food_supply_id) on delete restrict,
    company_id uuid not null references companies(company_id) on delete restrict,
    supplier_id uuid not null references food_suppliers(supplier_id) on delete restrict,
    amount numeric(14,2) not null check (amount > 0),
    payment_status text not null check (payment_status in ('PAID','FAILED')),
    provider_name text not null default 'INTERNAL_TEST',
    transaction_reference text,
    provider_response jsonb,
    failure_reason text,
    paid_by uuid references users(user_id) on delete set null,
    paid_at timestamptz,
    created_at timestamptz not null default now()
);
create index if not exists idx_food_supply_payments_company on food_supply_payments(company_id, payment_status);

-- Accountant-recorded items a worker takes while working.  The balance is
-- deducted through a separate ledger so an item can never be deducted twice.
create table if not exists worker_consumptions (
    consumption_id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(company_id) on delete restrict,
    employee_id uuid not null references employees(employee_id) on delete restrict,
    consumption_date date not null,
    item_name text not null,
    quantity numeric(14,2) not null default 1 check (quantity > 0),
    unit_price numeric(14,2) not null check (unit_price >= 0),
    total_amount numeric(14,2) not null check (total_amount >= 0),
    amount_deducted numeric(14,2) not null default 0 check (amount_deducted >= 0),
    remaining_balance numeric(14,2) not null check (remaining_balance >= 0),
    recorded_by uuid references users(user_id) on delete set null,
    remarks text,
    created_at timestamptz not null default now()
);
create index if not exists idx_worker_consumptions_employee_date
    on worker_consumptions(employee_id, consumption_date);
create index if not exists idx_worker_consumptions_company_date
    on worker_consumptions(company_id, consumption_date);

create table if not exists worker_consumption_deductions (
    worker_consumption_deduction_id uuid primary key default gen_random_uuid(),
    consumption_id uuid not null references worker_consumptions(consumption_id) on delete restrict,
    payroll_id uuid not null references payroll(payroll_id) on delete restrict,
    amount numeric(14,2) not null check (amount > 0),
    deducted_at timestamptz not null default now(),
    created_by uuid references users(user_id) on delete set null,
    unique(consumption_id, payroll_id)
);
create index if not exists idx_worker_consumption_deductions_payroll
    on worker_consumption_deductions(payroll_id);

alter table payroll
    add column if not exists consumption_deduction numeric(14,2) not null default 0
        check (consumption_deduction >= 0);
