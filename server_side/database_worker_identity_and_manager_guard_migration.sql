-- Worker identity and manager-scope protection.
-- Run AFTER database_owner_direct_workers_migration.sql.
-- A worker phone/ID cannot be used to put the same person in two management units.

alter table public.owner_direct_workers
  add column if not exists manager_user_id uuid references public.users(user_id);

-- Existing direct-worker deals must be assigned once before the rule can apply.
-- This selects the first manager in the same company only for legacy rows.
-- A correlated scalar subquery is used here because PostgreSQL does not allow
-- the target UPDATE alias to be referenced inside the previous LATERAL FROM.
update public.owner_direct_workers direct_worker
set manager_user_id = (
  select manager_user.user_id
  from public.users manager_user
  join public.roles manager_role on manager_role.role_id = manager_user.role_id and manager_role.role_name = 'MANAGER'
  join public.employees manager_employee on manager_employee.employee_id = manager_user.employee_id
  where manager_employee.company_id = direct_worker.company_id
  order by manager_employee.created_at nulls last
  limit 1
)
where direct_worker.manager_user_id is null;

do $$
begin
  if exists (select 1 from public.owner_direct_workers where manager_user_id is null) then
    raise exception 'Each existing owner direct-worker deal needs a manager assignment. Create a manager for its company, then run this migration again.';
  end if;
end $$;

alter table public.owner_direct_workers alter column manager_user_id set not null;

-- Normal worker phone numbers are canonicalized by the application. This index
-- prevents the same payment number belonging to two normal/flexible workers.
create unique index if not exists uq_worker_phone_identity
  on public.employees (phone)
  where is_worker = true and phone is not null and btrim(phone) <> '';

-- Owner direct workers use the same payment identity rules. A person cannot
-- have two deals under one manager or two different managers.
create unique index if not exists uq_owner_direct_worker_national_id
  on public.owner_direct_workers (national_id);
create unique index if not exists uq_owner_direct_worker_momo_phone
  on public.owner_direct_workers (momo_phone);

create or replace function public.guard_worker_identity_manager_scope()
returns trigger
language plpgsql
as $$
declare
  found_manager uuid;
begin
  if tg_table_name = 'employees' then
    if not new.is_worker then return new; end if;

    if exists (
      select 1 from public.owner_direct_workers direct_worker
      where direct_worker.national_id = new.national_id
         or direct_worker.momo_phone = new.phone
    ) then
      raise exception 'This worker ID or MTN number is already registered as an Owner direct worker. One person cannot be paid in both systems.';
    end if;

    if tg_op = 'UPDATE' and old.manager_user_id is distinct from new.manager_user_id then
      raise exception 'A registered worker cannot be moved to another manager. Register a new worker only after correcting the original record.';
    end if;
  else
    select manager_user.user_id into found_manager
    from public.users manager_user
    join public.roles manager_role on manager_role.role_id = manager_user.role_id and manager_role.role_name = 'MANAGER'
    join public.employees manager_employee on manager_employee.employee_id = manager_user.employee_id
    where manager_user.user_id = new.manager_user_id
      and manager_employee.company_id = new.company_id;
    if found_manager is null then
      raise exception 'Direct worker must be assigned to a manager in the same company.';
    end if;

    if exists (
      select 1 from public.employees employee
      where employee.is_worker = true
        and (employee.national_id = new.national_id or employee.phone = new.momo_phone)
    ) then
      raise exception 'This worker ID or MTN number already belongs to a registered worker. Duplicate payment identity is not allowed.';
    end if;

    if exists (
      select 1 from public.owner_direct_workers other
      where other.direct_worker_id is distinct from new.direct_worker_id
        and (other.national_id = new.national_id or other.momo_phone = new.momo_phone)
    ) then
      raise exception 'This worker ID or MTN number is already registered. A person can belong to only one manager and one payment record.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_employee_worker_identity_manager_scope on public.employees;
create trigger trg_guard_employee_worker_identity_manager_scope
before insert or update of national_id, phone, manager_user_id, is_worker on public.employees
for each row execute function public.guard_worker_identity_manager_scope();

drop trigger if exists trg_guard_owner_direct_worker_identity_manager_scope on public.owner_direct_workers;
create trigger trg_guard_owner_direct_worker_identity_manager_scope
before insert or update of national_id, momo_phone, manager_user_id, company_id on public.owner_direct_workers
for each row execute function public.guard_worker_identity_manager_scope();
