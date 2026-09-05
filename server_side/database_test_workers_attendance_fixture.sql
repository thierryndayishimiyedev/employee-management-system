-- TEST DATA ONLY — Run database_test_manager_scope_fixture.sql first.
--
-- Creates two WORKER accounts for Grace/Lydie and two for Didier/Ruth, then
-- records 12 PRESENT working days for each worker (2026-08-17 to 2026-08-29,
-- excluding both Sundays). This is enough to test advances and biweekly
-- payroll immediately. The inserts are idempotent: rerunning this file does
-- not create duplicate workers or attendance rows.

do $$
declare
    v_company_id uuid;
    v_worker_role_id uuid;
    v_worker_position_id uuid;
    v_grace_user_id uuid;
    v_lydie_user_id uuid;
    v_didier_user_id uuid;
    v_ruth_user_id uuid;
begin
    select company_id into v_company_id
    from public.companies
    where email = 'scope-test.company@cmk.example';
    if v_company_id is null then
        raise exception 'Run database_test_manager_scope_fixture.sql before this worker/attendance fixture.';
    end if;

    select role_id into v_worker_role_id from public.roles where role_name = 'WORKER';
    if v_worker_role_id is null then
        insert into public.roles (role_name, description)
        values ('WORKER', 'Mining worker')
        returning role_id into v_worker_role_id;
    end if;

    select position_id into v_worker_position_id from public.positions
    where company_id = v_company_id and position_name = 'Test Miner' limit 1;
    if v_worker_position_id is null then
        insert into public.positions (company_id, position_name, description, daily_salary)
        values (v_company_id, 'Test Miner', 'Test fixture mining worker', 4000)
        returning position_id into v_worker_position_id;
    end if;

    select user_id into v_grace_user_id from public.users where username = 'test.manager.grace';
    select user_id into v_lydie_user_id from public.users where username = 'test.accountant.lydie';
    select user_id into v_didier_user_id from public.users where username = 'test.manager.didier';
    select user_id into v_ruth_user_id from public.users where username = 'test.accountant.ruth';
    if v_grace_user_id is null or v_lydie_user_id is null or v_didier_user_id is null or v_ruth_user_id is null then
        raise exception 'The owner, managers, or accountants are missing. Run database_test_manager_scope_fixture.sql first.';
    end if;

    insert into public.employees (company_id, position_id, manager_user_id, employee_code, first_name, last_name, gender, date_of_birth, national_id, phone, email, address, hire_date, monthly_salary, daily_rate)
    values
        (v_company_id, v_worker_position_id, v_grace_user_id,  'SCOPE-GR-W-001', 'Aline',   'Uwera',      'FEMALE', '1997-02-10', '9800000000000001', '250788000101', 'aline.scope@cmk.example',   'Scope Test Company', '2026-08-01', 120000, 4000),
        (v_company_id, v_worker_position_id, v_grace_user_id,  'SCOPE-GR-W-002', 'Jean',    'Habimana',   'MALE',   '1995-04-16', '9800000000000002', '250788000102', 'jean.scope@cmk.example',    'Scope Test Company', '2026-08-01', 150000, 5000),
        (v_company_id, v_worker_position_id, v_didier_user_id, 'SCOPE-DI-W-001', 'Chantal', 'Mutesi',     'FEMALE', '1996-09-05', '9800000000000003', '250788000103', 'chantal.scope@cmk.example', 'Scope Test Company', '2026-08-01', 135000, 4500),
        (v_company_id, v_worker_position_id, v_didier_user_id, 'SCOPE-DI-W-002', 'Eric',    'Nkurunziza', 'MALE',   '1994-12-01', '9800000000000004', '250788000104', 'eric.scope@cmk.example',    'Scope Test Company', '2026-08-01', 180000, 6000)
    on conflict (employee_code) do update
    set company_id = excluded.company_id,
        position_id = excluded.position_id,
        manager_user_id = excluded.manager_user_id,
        daily_rate = excluded.daily_rate,
        monthly_salary = excluded.monthly_salary,
        status = 'ACTIVE';

    -- Worker login accounts are created so the system recognizes these as
    -- actual workers rather than manager/accountant employee profiles.
    insert into public.users (employee_id, role_id, username, password, is_active)
    select employee_id, v_worker_role_id,
           case employee_code
               when 'SCOPE-GR-W-001' then 'test.worker.aline'
               when 'SCOPE-GR-W-002' then 'test.worker.jean'
               when 'SCOPE-DI-W-001' then 'test.worker.chantal'
               when 'SCOPE-DI-W-002' then 'test.worker.eric'
           end,
           '$2b$10$P3oRkHoy7OOsxeVFMeTWG.AnYrqetojvGRMfkjNk4c4ICcUrt7hGa', true
    from public.employees
    where employee_code in ('SCOPE-GR-W-001', 'SCOPE-GR-W-002', 'SCOPE-DI-W-001', 'SCOPE-DI-W-002')
    on conflict (username) do update
    set employee_id = excluded.employee_id,
        role_id = excluded.role_id,
        is_active = true;

    insert into public.attendance (
        employee_id, company_id, manager_user_id, attendance_date,
        check_in, check_out, hours_worked, overtime_hours, attendance_status,
        remarks, recorded_by
    )
    select
        worker.employee_id,
        worker.company_id,
        worker.manager_user_id,
        work_day::date,
        time '08:00',
        time '16:00',
        8,
        0,
        'PRESENT',
        'Test fixture: full working day',
        case worker.manager_user_id
            when v_grace_user_id then v_lydie_user_id
            when v_didier_user_id then v_ruth_user_id
        end
    from public.employees worker
    cross join generate_series(date '2026-08-17', date '2026-08-29', interval '1 day') work_day
    where worker.employee_code in ('SCOPE-GR-W-001', 'SCOPE-GR-W-002', 'SCOPE-DI-W-001', 'SCOPE-DI-W-002')
      and extract(isodow from work_day) < 7
      and not exists (
          select 1 from public.attendance existing
          where existing.employee_id = worker.employee_id
            and existing.attendance_date = work_day::date
      );
end
$$;

-- Expected result: each manager has 2 workers and 24 attendance records.
select
    manager_employee.first_name || ' ' || manager_employee.last_name as manager,
    count(distinct worker.employee_id) as workers,
    count(attendance.attendance_id) as attendance_records,
    sum(case when attendance.attendance_status = 'PRESENT' then 1 else 0 end) as present_days
from public.employees worker
join public.users manager_user on manager_user.user_id = worker.manager_user_id
join public.employees manager_employee on manager_employee.employee_id = manager_user.employee_id
left join public.attendance attendance on attendance.employee_id = worker.employee_id
where worker.employee_code in ('SCOPE-GR-W-001', 'SCOPE-GR-W-002', 'SCOPE-DI-W-001', 'SCOPE-DI-W-002')
group by manager_employee.first_name, manager_employee.last_name
order by manager;
