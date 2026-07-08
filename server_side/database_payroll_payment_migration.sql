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

alter table if exists payroll
    drop constraint if exists payroll_payment_status_check;

alter table if exists payroll
    add constraint payroll_payment_status_check
    check (
        payment_status in (
            'PENDING',
            'GENERATED',
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
