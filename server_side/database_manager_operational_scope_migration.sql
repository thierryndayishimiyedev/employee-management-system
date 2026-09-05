-- Additive manager-operational-unit migration.
-- This keeps the existing company model intact and adds the missing level:
-- company -> manager user -> accountant / workers / operational records.
-- Review and run once in the Supabase SQL editor.

alter table employees
    add column if not exists manager_user_id uuid references users(user_id) on delete restrict;

-- A manager belongs to their own operational unit. Existing managers are
-- backfilled safely; other existing employees remain unassigned until an owner
-- assigns them to a manager.
update employees employee
set manager_user_id = account.user_id
from users account
join roles role on role.role_id = account.role_id
where account.employee_id = employee.employee_id
  and role.role_name = 'MANAGER'
  and employee.manager_user_id is null;

create index if not exists idx_employees_company_manager
    on employees(company_id, manager_user_id);

alter table attendance add column if not exists manager_user_id uuid references users(user_id) on delete restrict;
alter table production_records add column if not exists manager_user_id uuid references users(user_id) on delete restrict;
alter table salary_advances add column if not exists manager_user_id uuid references users(user_id) on delete restrict;
alter table payroll add column if not exists manager_user_id uuid references users(user_id) on delete restrict;
alter table reports add column if not exists manager_user_id uuid references users(user_id) on delete restrict;
alter table payments add column if not exists manager_user_id uuid references users(user_id) on delete restrict;
alter table food_supplies add column if not exists manager_user_id uuid references users(user_id) on delete restrict;
alter table worker_consumptions add column if not exists manager_user_id uuid references users(user_id) on delete restrict;

create index if not exists idx_attendance_company_manager on attendance(company_id, manager_user_id);
create index if not exists idx_payroll_company_manager on payroll(company_id, manager_user_id);
create index if not exists idx_reports_company_manager on reports(company_id, manager_user_id);
create index if not exists idx_food_supplies_company_manager on food_supplies(company_id, manager_user_id);
create index if not exists idx_worker_consumptions_company_manager on worker_consumptions(company_id, manager_user_id);

-- Backfill rows whose employee already has a manager assignment. Rows without
-- one are deliberately retained for owner review rather than guessed.
update attendance record set manager_user_id = employee.manager_user_id
from employees employee where record.employee_id = employee.employee_id
  and record.manager_user_id is null and employee.manager_user_id is not null;
update production_records record set manager_user_id = employee.manager_user_id
from employees employee where record.employee_id = employee.employee_id
  and record.manager_user_id is null and employee.manager_user_id is not null;
update salary_advances record set manager_user_id = employee.manager_user_id
from employees employee where record.employee_id = employee.employee_id
  and record.manager_user_id is null and employee.manager_user_id is not null;
update payroll record set manager_user_id = employee.manager_user_id
from employees employee where record.employee_id = employee.employee_id
  and record.manager_user_id is null and employee.manager_user_id is not null;
update payments record set manager_user_id = employee.manager_user_id
from employees employee where record.employee_id = employee.employee_id
  and record.manager_user_id is null and employee.manager_user_id is not null;
update worker_consumptions record set manager_user_id = employee.manager_user_id
from employees employee where record.employee_id = employee.employee_id
  and record.manager_user_id is null and employee.manager_user_id is not null;
update reports record set manager_user_id = accountant.manager_user_id
from employees accountant where record.accountant_id = accountant.employee_id
  and record.manager_user_id is null and accountant.manager_user_id is not null;

