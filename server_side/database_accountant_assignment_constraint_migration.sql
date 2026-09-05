-- Enforce the operational model: one active accountant serves one manager.
-- Apply this in the Supabase SQL editor after the manager operational-scope
-- migration.  Existing rows are preserved; the trigger prevents any new or
-- reactivated duplicate accountant assignment.

create or replace function public.enforce_one_active_accountant_per_manager()
returns trigger
language plpgsql
as $$
declare
    target_role text;
    target_manager uuid;
    target_company uuid;
begin
    if coalesce(new.is_active, true) = false then
        return new;
    end if;

    select role_name into target_role
    from public.roles
    where role_id = new.role_id;

    if target_role is distinct from 'ACCOUNTANT' then
        return new;
    end if;

    select company_id, manager_user_id
    into target_company, target_manager
    from public.employees
    where employee_id = new.employee_id;

    if target_manager is null then
        raise exception 'An accountant must be assigned to a manager.'
            using errcode = '23514';
    end if;

    if exists (
        select 1
        from public.users existing_user
        join public.roles existing_role on existing_role.role_id = existing_user.role_id
        join public.employees existing_employee on existing_employee.employee_id = existing_user.employee_id
        where existing_user.user_id <> new.user_id
          and coalesce(existing_user.is_active, true) = true
          and existing_role.role_name = 'ACCOUNTANT'
          and existing_employee.company_id = target_company
          and existing_employee.manager_user_id = target_manager
    ) then
        raise exception 'This manager already has an active accountant.'
            using errcode = '23505';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_one_active_accountant_per_manager on public.users;

create trigger trg_one_active_accountant_per_manager
before insert or update of employee_id, role_id, is_active
on public.users
for each row
execute function public.enforce_one_active_accountant_per_manager();

-- Optional review query before applying the trigger. It should return no rows
-- once the company data has one active accountant for each manager.
-- select e.company_id, e.manager_user_id, count(*) as active_accountants
-- from public.users u
-- join public.roles r on r.role_id = u.role_id and r.role_name = 'ACCOUNTANT'
-- join public.employees e on e.employee_id = u.employee_id
-- where coalesce(u.is_active, true) = true
-- group by e.company_id, e.manager_user_id
-- having count(*) > 1;
