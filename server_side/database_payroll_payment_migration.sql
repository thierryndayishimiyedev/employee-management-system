-- Payroll/payment workflow continuation for the existing Supabase/Postgres database.
-- Run this after reviewing existing column/table names. It uses ALTER/CREATE IF NOT EXISTS
-- so existing data is preserved.

alter table if exists payroll
    add column if not exists company_id uuid,
    add column if not exists payment_status text not null default 'GENERATED',
    add column if not exists approved_by uuid,
    add column if not exists approved_at timestamptz,
    add column if not exists rejected_by uuid,
    add column if not exists rejected_at timestamptz,
    add column if not exists rejection_reason text;

-- Two-step payroll approval.  These are additive and retain all existing records.
alter table if exists payroll
    add column if not exists manager_approved_by uuid references users(user_id) on delete set null,
    add column if not exists manager_approved_at timestamptz,
    add column if not exists manager_rejected_by uuid references users(user_id) on delete set null,
    add column if not exists manager_rejected_at timestamptz,
    add column if not exists manager_rejection_reason text,
    add column if not exists owner_approved_by uuid references users(user_id) on delete set null,
    add column if not exists owner_approved_at timestamptz,
    add column if not exists owner_rejected_by uuid references users(user_id) on delete set null,
    add column if not exists owner_rejected_at timestamptz,
    add column if not exists owner_rejection_reason text;

-- Preserve both manager and owner decisions for advances and allow only approved
-- advances to become payable. Existing data remains intact.
alter table if exists salary_advances
    add column if not exists manager_reviewed_by uuid references users(user_id) on delete set null,
    add column if not exists manager_reviewed_at timestamptz,
    add column if not exists manager_comments text,
    add column if not exists owner_reviewed_by uuid references users(user_id) on delete set null,
    add column if not exists owner_reviewed_at timestamptz,
    add column if not exists owner_comments text,
    add column if not exists paid_by uuid references users(user_id) on delete set null,
    add column if not exists paid_at timestamptz,
    add column if not exists payment_reference text;

alter table if exists payroll
    drop constraint if exists payroll_payment_status_check;

alter table if exists payroll
    add constraint payroll_payment_status_check
    check (
        payment_status in (
            'PENDING',
            'GENERATED',
            'PENDING_MANAGER',
            'PENDING_OWNER',
            'APPROVED',
            'PAYMENT_PROCESSING',
            'PAID',
            'PARTIALLY_PAID',
            'FAILED'
        )
    );

create index if not exists idx_payroll_period_status
    on payroll(payroll_year, payroll_month, payment_status);

create index if not exists idx_payroll_employee_period
    on payroll(employee_id, payroll_year, payroll_month);

create table if not exists payments (
    payment_id uuid primary key default gen_random_uuid(),
    payroll_id uuid not null references payroll(payroll_id) on update cascade on delete restrict,
    employee_id uuid not null references employees(employee_id) on update cascade on delete restrict,
    company_id uuid references companies(company_id) on update cascade on delete restrict,
    amount numeric(12, 2) not null check (amount >= 0),
    receiver_phone varchar(30),
    receiver_name varchar(200),
    phone varchar(30),
    beneficiary_name varchar(200),
    payment_method varchar(50) not null default 'MTN_MOBILE_MONEY',
    transaction_id varchar(120),
    reference_id varchar(120),
    transaction_reference varchar(120),
    payment_status text not null default 'PENDING',
    failure_reason text,
    paid_at timestamptz,
    payment_date timestamptz default now(),
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table if exists payments
    add column if not exists company_id uuid,
    add column if not exists receiver_phone varchar(30),
    add column if not exists receiver_name varchar(200),
    add column if not exists phone varchar(30),
    add column if not exists beneficiary_name varchar(200),
    add column if not exists transaction_id varchar(120),
    add column if not exists reference_id varchar(120),
    add column if not exists transaction_reference varchar(120),
    add column if not exists failure_reason text,
    add column if not exists paid_at timestamptz,
    add column if not exists payment_date timestamptz default now(),
    add column if not exists created_by uuid,
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

alter table if exists payments
    drop constraint if exists payments_payment_status_check;

alter table if exists payments
    add constraint payments_payment_status_check
    check (
        payment_status in (
            'PENDING',
            'READY',
            'PROCESSING',
            'PAID',
            'FAILED',
            'SUCCESS',
            'FAILED_VALIDATION',
            'FAILED_NETWORK',
            'FAILED_INSUFFICIENT_BALANCE',
            'FAILED_UNKNOWN'
        )
    );

create index if not exists idx_payments_payroll_status
    on payments(payroll_id, payment_status);

create index if not exists idx_payments_employee
    on payments(employee_id);

create index if not exists idx_payments_company
    on payments(company_id);

-- Expected status values used by the application:
-- payroll.payment_status:
-- GENERATED, APPROVED, PAYMENT_PROCESSING, PAID, PARTIALLY_PAID, FAILED
--
-- payments.payment_status:
-- PENDING, READY, PROCESSING, PAID, FAILED, FAILED_VALIDATION,
-- FAILED_NETWORK, FAILED_INSUFFICIENT_BALANCE, FAILED_UNKNOWN

-- ============================================================================
-- Final mining operations integration (additive only; safe for existing data)
-- ============================================================================

-- Legacy company_owners rows are retained.  Add the authenticated users FK and
-- backfill only rows that have an unambiguous matching username.
alter table if exists company_owners
    add column if not exists owner_user_id uuid references users(user_id) on delete restrict;

update company_owners co
set owner_user_id = u.user_id
from users u
where co.owner_user_id is null
  and co.username is not null
  and co.username = u.username;

create unique index if not exists uq_company_owners_user_company
    on company_owners(owner_user_id, company_id)
    where owner_user_id is not null;
create index if not exists idx_company_owners_owner_user
    on company_owners(owner_user_id);

-- Existing production data remains valid.  Price/value fields intentionally
-- remain NULL for historic rows rather than inventing financial figures.
alter table if exists production_records
    add column if not exists unit_price numeric(14,2) check (unit_price is null or unit_price >= 0),
    add column if not exists activity_details text,
    add column if not exists working_hours numeric(6,2) check (working_hours is null or working_hours >= 0),
    add column if not exists recorded_by uuid references users(user_id) on delete set null;

create index if not exists idx_production_records_date on production_records(production_date);
create index if not exists idx_production_records_recorder on production_records(recorded_by);

create table if not exists production_expenses (
    expense_id uuid primary key default gen_random_uuid(),
    production_id uuid not null references production_records(production_id) on delete restrict,
    company_id uuid not null references companies(company_id) on delete restrict,
    expense_date date not null,
    description text not null,
    amount numeric(14,2) not null check (amount >= 0),
    recorded_by uuid references users(user_id) on delete set null,
    created_at timestamptz not null default now()
);
create index if not exists idx_production_expenses_production on production_expenses(production_id);
create index if not exists idx_production_expenses_company_date on production_expenses(company_id, expense_date);

create table if not exists production_workers (
    production_worker_id uuid primary key default gen_random_uuid(),
    production_id uuid not null references production_records(production_id) on delete cascade,
    employee_id uuid not null references employees(employee_id) on delete restrict,
    working_hours numeric(6,2) check (working_hours is null or working_hours >= 0),
    created_at timestamptz not null default now(),
    unique (production_id, employee_id)
);

-- Advance records are retained and acquire audit/payment/deduction state.
alter table if exists salary_advances
    add column if not exists manager_approved_by uuid references users(user_id) on delete set null,
    add column if not exists manager_approved_at timestamptz,
    add column if not exists manager_rejection_reason text,
    add column if not exists owner_approved_by uuid references users(user_id) on delete set null,
    add column if not exists owner_approved_at timestamptz,
    add column if not exists owner_rejection_reason text,
    add column if not exists payment_status text not null default 'UNPAID',
    add column if not exists payment_date timestamptz,
    add column if not exists amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
    add column if not exists amount_deducted numeric(14,2) not null default 0 check (amount_deducted >= 0),
    add column if not exists remaining_balance numeric(14,2),
    add column if not exists deducted_by_payroll_id uuid references payroll(payroll_id) on delete set null,
    add column if not exists deduction_status text not null default 'NOT_DEDUCTED',
    add column if not exists payment_reference text,
    add column if not exists payment_provider text;

update salary_advances
set remaining_balance = greatest(amount - amount_deducted, 0)
where remaining_balance is null;
create index if not exists idx_salary_advances_employee_balance
    on salary_advances(employee_id, remaining_balance);

-- Payroll fields preserve the legacy payment_status while providing a separate
-- approval status for Accountant -> Manager -> Owner workflow.
alter table if exists payroll
    add column if not exists approval_status text not null default 'GENERATED',
    add column if not exists manager_approved_by uuid references users(user_id) on delete set null,
    add column if not exists manager_approved_at timestamptz,
    add column if not exists manager_rejected_by uuid references users(user_id) on delete set null,
    add column if not exists manager_rejected_at timestamptz,
    add column if not exists manager_rejection_reason text,
    add column if not exists owner_approved_by uuid references users(user_id) on delete set null,
    add column if not exists owner_approved_at timestamptz,
    add column if not exists owner_rejected_by uuid references users(user_id) on delete set null,
    add column if not exists owner_rejected_at timestamptz,
    add column if not exists owner_rejection_reason text,
    add column if not exists locked_at timestamptz;

create index if not exists idx_payroll_approval_status on payroll(approval_status);

-- Reports already contain most workflow fields in the live database. These two
-- additions provide an immutable lock timestamp and an authenticated creator.
alter table if exists reports
    add column if not exists created_by uuid references users(user_id) on delete set null,
    add column if not exists locked_at timestamptz;
create index if not exists idx_reports_company_status_date on reports(company_id, status, report_date);
