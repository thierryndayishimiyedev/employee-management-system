-- Worker registration simplification.
-- Run once in Supabase SQL editor before using the updated worker form.

alter table public.employees
    add column if not exists is_worker boolean not null default false,
    add column if not exists ejo_heza boolean not null default false,
    add column if not exists mutuelle_de_sante boolean not null default false;

-- Date of birth is intentionally not collected for worker onboarding.
alter table public.employees
    alter column date_of_birth drop not null;

-- Existing worker accounts remain workers after the change. New workers no
-- longer need user/login accounts and are identified by is_worker instead.
update public.employees employee
set is_worker = true
from public.users account
join public.roles role on role.role_id = account.role_id
where account.employee_id = employee.employee_id
  and role.role_name = 'WORKER';

create index if not exists idx_employees_company_manager_worker
    on public.employees(company_id, manager_user_id, is_worker);
