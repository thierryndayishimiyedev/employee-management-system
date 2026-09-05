-- TEST FIXTURE ONLY — Safe to run repeatedly in the Supabase SQL editor.
--
-- Prerequisite: run database_manager_operational_scope_migration.sql first.
-- This creates one isolated test company, one owner, two managers, and one
-- accountant for each manager. It intentionally creates NO workers, NO
-- attendance, NO payroll, and NO payments: use the two accountant accounts
-- to create those records through the application and verify isolation.
--
-- Login credentials (all are test-only):
--   Owner:              test.owner.cmk       / OwnerTest@2026
--   Grace, Manager:     test.manager.grace   / GraceTest@2026
--   Lydie, Accountant:  test.accountant.lydie / LydieTest@2026
--   Didier, Manager:    test.manager.didier  / DidierTest@2026
--   Ruth, Accountant:   test.accountant.ruth / RuthTest@2026

do $$
declare
    test_company_id uuid;
    role_owner_id uuid;
    role_manager_id uuid;
    role_accountant_id uuid;
    owner_position_id uuid;
    manager_position_id uuid;
    accountant_position_id uuid;
    owner_employee_id uuid;
    v_owner_user_id uuid;
    grace_employee_id uuid;
    grace_user_id uuid;
    lydie_employee_id uuid;
    lydie_user_id uuid;
    didier_employee_id uuid;
    didier_user_id uuid;
    ruth_employee_id uuid;
    ruth_user_id uuid;
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'employees' and column_name = 'manager_user_id'
    ) then
        raise exception 'Run database_manager_operational_scope_migration.sql before this test fixture.';
    end if;

    insert into public.roles (role_name, description) values
        ('OWNER', 'Company owner'),
        ('MANAGER', 'Operational manager'),
        ('ACCOUNTANT', 'Manager-assigned accountant')
    on conflict (role_name) do nothing;

    select role_id into role_owner_id from public.roles where role_name = 'OWNER';
    select role_id into role_manager_id from public.roles where role_name = 'MANAGER';
    select role_id into role_accountant_id from public.roles where role_name = 'ACCOUNTANT';

    select company_id into test_company_id
    from public.companies
    where email = 'scope-test.company@cmk.example';

    if test_company_id is null then
        insert into public.companies (
            company_name, mining_license_number, tin_number, phone, email,
            province, district, sector, village, address, registration_date
        ) values (
            'CMK Scope Test Mining Company', 'CMK-SCOPE-TEST-2026', 'CMK-SCOPE-TIN-2026',
            '250788000001', 'scope-test.company@cmk.example',
            'Eastern Province', 'Gatsibo', 'Kabarore', 'Scope Test Village',
            'Test-only company for manager/accountant isolation checks', current_date
        ) returning company_id into test_company_id;
    end if;

    select position_id into owner_position_id from public.positions
    where company_id = test_company_id and position_name = 'Test Owner' limit 1;
    if owner_position_id is null then
        insert into public.positions (company_id, position_name, description, daily_salary)
        values (test_company_id, 'Test Owner', 'Test fixture owner position', 30000)
        returning position_id into owner_position_id;
    end if;

    select position_id into manager_position_id from public.positions
    where company_id = test_company_id and position_name = 'Test Manager' limit 1;
    if manager_position_id is null then
        insert into public.positions (company_id, position_name, description, daily_salary)
        values (test_company_id, 'Test Manager', 'Test fixture manager position', 20000)
        returning position_id into manager_position_id;
    end if;

    select position_id into accountant_position_id from public.positions
    where company_id = test_company_id and position_name = 'Test Accountant' limit 1;
    if accountant_position_id is null then
        insert into public.positions (company_id, position_name, description, daily_salary)
        values (test_company_id, 'Test Accountant', 'Test fixture accountant position', 15000)
        returning position_id into accountant_position_id;
    end if;

    -- Owner
    select user_id, employee_id into v_owner_user_id, owner_employee_id from public.users where username = 'test.owner.cmk';
    if v_owner_user_id is null then
        insert into public.employees (company_id, position_id, employee_code, first_name, last_name, gender, date_of_birth, national_id, phone, email, address, hire_date, monthly_salary, daily_rate)
        values (test_company_id, owner_position_id, 'SCOPE-OWN-001', 'Test', 'Owner', 'MALE', '1980-01-01', '9900000000000001', '250788000010', 'test.owner@cmk.example', 'Scope Test Company', current_date, 900000, 30000)
        returning employee_id into owner_employee_id;
        insert into public.users (employee_id, role_id, username, password, is_active)
        values (owner_employee_id, role_owner_id, 'test.owner.cmk', '$2b$10$P3oRkHoy7OOsxeVFMeTWG.AnYrqetojvGRMfkjNk4c4ICcUrt7hGa', true)
        returning user_id into v_owner_user_id;
    else
        update public.users set role_id = role_owner_id, password = '$2b$10$P3oRkHoy7OOsxeVFMeTWG.AnYrqetojvGRMfkjNk4c4ICcUrt7hGa', is_active = true where user_id = v_owner_user_id;
    end if;

    if not exists (
        select 1
        from public.company_owners assignment
        where assignment.company_id = test_company_id
          and assignment.owner_user_id = v_owner_user_id
    ) then
        insert into public.company_owners (company_id, owner_user_id, first_name, last_name, phone, email, username, password)
        values (test_company_id, v_owner_user_id, 'Test', 'Owner', '250788000010', 'test.owner@cmk.example', 'test.owner.cmk', '$2b$10$P3oRkHoy7OOsxeVFMeTWG.AnYrqetojvGRMfkjNk4c4ICcUrt7hGa');
    end if;

    -- Manager Grace: her manager_user_id is her own user id.
    select user_id, employee_id into grace_user_id, grace_employee_id from public.users where username = 'test.manager.grace';
    if grace_user_id is null then
        insert into public.employees (company_id, position_id, employee_code, first_name, last_name, gender, date_of_birth, national_id, phone, email, address, hire_date, monthly_salary, daily_rate)
        values (test_company_id, manager_position_id, 'SCOPE-MGR-001', 'Grace', 'Ishimwe', 'FEMALE', '1988-03-12', '9900000000000002', '250788000011', 'grace.test@cmk.example', 'Scope Test Company', current_date, 600000, 20000)
        returning employee_id into grace_employee_id;
        insert into public.users (employee_id, role_id, username, password, is_active)
        values (grace_employee_id, role_manager_id, 'test.manager.grace', '$2b$10$NfZukCn0YweEPfDHW6VuheTLiWoxGshhMtQbs9iAygAaWfyK0ltxW', true)
        returning user_id into grace_user_id;
    else
        update public.users set role_id = role_manager_id, password = '$2b$10$NfZukCn0YweEPfDHW6VuheTLiWoxGshhMtQbs9iAygAaWfyK0ltxW', is_active = true where user_id = grace_user_id;
    end if;
    update public.employees set company_id = test_company_id, position_id = manager_position_id, manager_user_id = grace_user_id where employee_id = grace_employee_id;

    -- Manager Didier: his manager_user_id is his own user id.
    select user_id, employee_id into didier_user_id, didier_employee_id from public.users where username = 'test.manager.didier';
    if didier_user_id is null then
        insert into public.employees (company_id, position_id, employee_code, first_name, last_name, gender, date_of_birth, national_id, phone, email, address, hire_date, monthly_salary, daily_rate)
        values (test_company_id, manager_position_id, 'SCOPE-MGR-002', 'Didier', 'Niyonzima', 'MALE', '1986-08-22', '9900000000000003', '250788000012', 'didier.test@cmk.example', 'Scope Test Company', current_date, 600000, 20000)
        returning employee_id into didier_employee_id;
        insert into public.users (employee_id, role_id, username, password, is_active)
        values (didier_employee_id, role_manager_id, 'test.manager.didier', '$2b$10$kDikoMZLYkQB1WkRAijnyuicgNsX4OANG273Ixp.OErx16jOOJGny', true)
        returning user_id into didier_user_id;
    else
        update public.users set role_id = role_manager_id, password = '$2b$10$kDikoMZLYkQB1WkRAijnyuicgNsX4OANG273Ixp.OErx16jOOJGny', is_active = true where user_id = didier_user_id;
    end if;
    update public.employees set company_id = test_company_id, position_id = manager_position_id, manager_user_id = didier_user_id where employee_id = didier_employee_id;

    -- Accountant Lydie belongs only to Grace.
    select user_id, employee_id into lydie_user_id, lydie_employee_id from public.users where username = 'test.accountant.lydie';
    if lydie_user_id is null then
        insert into public.employees (company_id, position_id, manager_user_id, employee_code, first_name, last_name, gender, date_of_birth, national_id, phone, email, address, hire_date, monthly_salary, daily_rate)
        values (test_company_id, accountant_position_id, grace_user_id, 'SCOPE-ACC-001', 'Lydie', 'Mukamana', 'FEMALE', '1991-06-18', '9900000000000004', '250788000013', 'lydie.test@cmk.example', 'Scope Test Company', current_date, 450000, 15000)
        returning employee_id into lydie_employee_id;
        insert into public.users (employee_id, role_id, username, password, is_active)
        values (lydie_employee_id, role_accountant_id, 'test.accountant.lydie', '$2b$10$8rsZ1E2upguU3ByMal7Pfegr.9.YVgHukWn.kgXxnHJh5RiQ.PS0u', true)
        returning user_id into lydie_user_id;
    else
        update public.users set role_id = role_accountant_id, password = '$2b$10$8rsZ1E2upguU3ByMal7Pfegr.9.YVgHukWn.kgXxnHJh5RiQ.PS0u', is_active = true where user_id = lydie_user_id;
        update public.employees set company_id = test_company_id, position_id = accountant_position_id, manager_user_id = grace_user_id where employee_id = lydie_employee_id;
    end if;

    -- Accountant Ruth belongs only to Didier.
    select user_id, employee_id into ruth_user_id, ruth_employee_id from public.users where username = 'test.accountant.ruth';
    if ruth_user_id is null then
        insert into public.employees (company_id, position_id, manager_user_id, employee_code, first_name, last_name, gender, date_of_birth, national_id, phone, email, address, hire_date, monthly_salary, daily_rate)
        values (test_company_id, accountant_position_id, didier_user_id, 'SCOPE-ACC-002', 'Ruth', 'Uwimana', 'FEMALE', '1993-11-04', '9900000000000005', '250788000014', 'ruth.test@cmk.example', 'Scope Test Company', current_date, 450000, 15000)
        returning employee_id into ruth_employee_id;
        insert into public.users (employee_id, role_id, username, password, is_active)
        values (ruth_employee_id, role_accountant_id, 'test.accountant.ruth', '$2b$10$SJ7I6Mlwvh6RyBQLkQQRe.S1/ZrJWLGW8V7tv1e3dfvJydLOSP7sS', true)
        returning user_id into ruth_user_id;
    else
        update public.users set role_id = role_accountant_id, password = '$2b$10$SJ7I6Mlwvh6RyBQLkQQRe.S1/ZrJWLGW8V7tv1e3dfvJydLOSP7sS', is_active = true where user_id = ruth_user_id;
        update public.employees set company_id = test_company_id, position_id = accountant_position_id, manager_user_id = didier_user_id where employee_id = ruth_employee_id;
    end if;
end
$$;

-- Verification: this must show exactly the two expected accountant assignments.
select
    manager_employee.first_name || ' ' || manager_employee.last_name as manager,
    accountant_employee.first_name || ' ' || accountant_employee.last_name as accountant,
    accountant_user.username as accountant_username
from public.users accountant_user
join public.roles accountant_role on accountant_role.role_id = accountant_user.role_id
join public.employees accountant_employee on accountant_employee.employee_id = accountant_user.employee_id
join public.users manager_user on manager_user.user_id = accountant_employee.manager_user_id
join public.employees manager_employee on manager_employee.employee_id = manager_user.employee_id
where accountant_role.role_name = 'ACCOUNTANT'
  and accountant_user.username in ('test.accountant.lydie', 'test.accountant.ruth')
order by manager;
