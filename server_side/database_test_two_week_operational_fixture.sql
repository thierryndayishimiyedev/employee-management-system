-- COMPLETE TEST FIXTURE ONLY. Safe to run repeatedly in the Supabase SQL editor.
--
-- Prerequisites (run first):
--   1. database_manager_operational_scope_migration.sql
--   2. database_worker_registration_simplification_migration.sql
--   3. database_flexible_worker_migration.sql
--   4. database_attendance_shift_and_rate_override_migration.sql
--   5. database_monthly_staff_owner_private_and_night_shift_migration.sql
--
-- This creates a separate demonstration company. It creates NO payroll and
-- NO salary advances: generate those yourself through the application.
-- Period: 07 Sep 2026 through 20 Sep 2026 (12 working days; Sundays excluded).
-- Workers: 12 fixed daily workers + 4 flexible workers. Eight fixed workers
-- have six night records (3 in each week). Seven workers have consumptions.

do $$
declare
  c uuid; owner_role uuid; manager_role uuid; accountant_role uuid; supplier_role uuid;
  owner_position uuid; manager_position uuid; accountant_position uuid; miner_position uuid;
  owner_employee uuid; manager_employee uuid; accountant_employee uuid;
  owner_user uuid; manager_user uuid; accountant_user uuid; supplier_user uuid;
  supplier uuid; shop uuid;
  test_hash text := '$2b$10$P3oRkHoy7OOsxeVFMeTWG.AnYrqetojvGRMfkjNk4c4ICcUrt7hGa';
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='attendance' and column_name='shift_type') then
    raise exception 'Run database_monthly_staff_owner_private_and_night_shift_migration.sql first.';
  end if;
  insert into public.roles(role_name,description) values
    ('OWNER','Test company owner'),('MANAGER','Test operational manager'),('ACCOUNTANT','Test accountant'),('FOOD_SUPPLIER','Test food supplier')
  on conflict(role_name) do nothing;
  select role_id into owner_role from public.roles where role_name='OWNER';
  select role_id into manager_role from public.roles where role_name='MANAGER';
  select role_id into accountant_role from public.roles where role_name='ACCOUNTANT';
  select role_id into supplier_role from public.roles where role_name='FOOD_SUPPLIER';

  select company_id into c from public.companies where email='two-week.demo@cmk.example';
  if c is null then
    insert into public.companies(company_name,mining_license_number,tin_number,phone,email,province,district,sector,village,address,registration_date)
    values('CMK Two Week Demo Mining','CMK-DEMO-2026','CMK-DEMO-TIN-2026','250788990001','two-week.demo@cmk.example','Eastern Province','Gatsibo','Kabarore','Demo Village','Fixture company only',date '2026-09-01') returning company_id into c;
  end if;
  select position_id into owner_position from public.positions where company_id=c and position_name='Demo Owner' limit 1;
  if owner_position is null then insert into public.positions(company_id,position_name,description,daily_salary) values(c,'Demo Owner','Fixture owner',30000) returning position_id into owner_position; end if;
  select position_id into manager_position from public.positions where company_id=c and position_name='Demo Manager' limit 1;
  if manager_position is null then insert into public.positions(company_id,position_name,description,daily_salary) values(c,'Demo Manager','Fixture manager',20000) returning position_id into manager_position; end if;
  select position_id into accountant_position from public.positions where company_id=c and position_name='Demo Accountant' limit 1;
  if accountant_position is null then insert into public.positions(company_id,position_name,description,daily_salary) values(c,'Demo Accountant','Fixture accountant',15000) returning position_id into accountant_position; end if;
  select position_id into miner_position from public.positions where company_id=c and position_name='Demo Miner' limit 1;
  if miner_position is null then insert into public.positions(company_id,position_name,description,daily_salary) values(c,'Demo Miner','Fixture mining worker',5000) returning position_id into miner_position; end if;

  insert into public.employees(company_id,position_id,employee_code,first_name,last_name,gender,date_of_birth,national_id,phone,email,address,hire_date,monthly_salary,daily_rate)
  values(c,owner_position,'DEM-OWN-001','Demo','Owner','MALE','1980-01-01','9200000000000001','250788990010','demo.owner@cmk.example','Demo mine','2026-09-01',900000,30000)
  on conflict(employee_code) do update set company_id=excluded.company_id,position_id=excluded.position_id returning employee_id into owner_employee;
  insert into public.users(employee_id,role_id,username,password,is_active) values(owner_employee,owner_role,'demo.owner',test_hash,true)
  on conflict(username) do update set employee_id=excluded.employee_id,role_id=excluded.role_id,password=excluded.password,is_active=true returning user_id into owner_user;
  if not exists(select 1 from public.company_owners where company_id=c and owner_user_id=owner_user) then
    insert into public.company_owners(company_id,owner_user_id,first_name,last_name,phone,email,username,password) values(c,owner_user,'Demo','Owner','250788990010','demo.owner@cmk.example','demo.owner',test_hash);
  end if;

  insert into public.employees(company_id,position_id,employee_code,first_name,last_name,gender,date_of_birth,national_id,phone,email,address,hire_date,monthly_salary,daily_rate)
  values(c,manager_position,'DEM-MGR-001','Moses','Ndayishimiye','MALE','1986-03-12','9200000000000002','250788990011','demo.manager@cmk.example','Demo mine','2026-09-01',600000,20000)
  on conflict(employee_code) do update set company_id=excluded.company_id,position_id=excluded.position_id returning employee_id into manager_employee;
  insert into public.users(employee_id,role_id,username,password,is_active) values(manager_employee,manager_role,'demo.manager',test_hash,true)
  on conflict(username) do update set employee_id=excluded.employee_id,role_id=excluded.role_id,password=excluded.password,is_active=true returning user_id into manager_user;
  update public.employees set manager_user_id=manager_user where employee_id=manager_employee;

  insert into public.employees(company_id,position_id,manager_user_id,employee_code,first_name,last_name,gender,date_of_birth,national_id,phone,email,address,hire_date,monthly_salary,daily_rate)
  values(c,accountant_position,manager_user,'DEM-ACC-001','Alice','Mukamana','FEMALE','1991-06-18','9200000000000003','250788990012','demo.accountant@cmk.example','Demo mine','2026-09-01',450000,15000)
  on conflict(employee_code) do update set company_id=excluded.company_id,position_id=excluded.position_id,manager_user_id=excluded.manager_user_id returning employee_id into accountant_employee;
  insert into public.users(employee_id,role_id,username,password,is_active) values(accountant_employee,accountant_role,'demo.accountant',test_hash,true)
  on conflict(username) do update set employee_id=excluded.employee_id,role_id=excluded.role_id,password=excluded.password,is_active=true returning user_id into accountant_user;

  insert into public.users(role_id,username,password,is_active) values(supplier_role,'demo.supplier',test_hash,true)
  on conflict(username) do update set role_id=excluded.role_id,password=excluded.password,is_active=true returning user_id into supplier_user;
  select supplier_id into supplier from public.food_suppliers where user_id=supplier_user;
  if supplier is null then insert into public.food_suppliers(user_id,company_id,supplier_name,phone,email,created_by) values(supplier_user,c,'Demo Food Supplier','250788990013','demo.supplier@cmk.example',owner_user) returning supplier_id into supplier; else update public.food_suppliers set company_id=c,supplier_name='Demo Food Supplier',phone='250788990013',active=true where supplier_id=supplier; end if;
  select shopkeeper_id into shop from public.shopkeepers where company_id=c and manager_user_id=manager_user and shopkeeper_name='Demo Site Shop';
  if shop is null then insert into public.shopkeepers(company_id,manager_user_id,shopkeeper_name,phone,active,created_by) values(c,manager_user,'Demo Site Shop','250788990014',true,accountant_user) returning shopkeeper_id into shop; end if;

  -- Owner plan: 19:00 to 23:00, adds 1,000 RWF to fixed and flexible night work.
  update public.night_shift_settings set starts_at='19:00',ends_at='23:00',fixed_worker_rate_adjustment=1000,flexible_worker_rate_adjustment=1000,is_active=true,configured_by=owner_user,configured_at=now() where company_id=c and manager_user_id=manager_user and is_active=true;
  if not exists(select 1 from public.night_shift_settings where company_id=c and manager_user_id=manager_user and is_active=true) then insert into public.night_shift_settings(company_id,manager_user_id,starts_at,ends_at,fixed_worker_rate_adjustment,flexible_worker_rate_adjustment,is_active,configured_by) values(c,manager_user,'19:00','23:00',1000,1000,true,owner_user); end if;

  insert into public.employees(company_id,position_id,manager_user_id,employee_code,first_name,last_name,gender,date_of_birth,national_id,phone,address,hire_date,monthly_salary,daily_rate,is_worker,payment_type)
  select c,miner_position,manager_user,code,first_name,last_name,gender::public.gender_type,birth,nid,phone,'Demo mine','2026-09-01',rate*30,rate,true,payment_type
  from (values
    ('DEM-FX-01','Aline','Uwera','FEMALE','1997-02-10'::date,'9200000000000101','250788991001',5000::numeric,'FIXED_DAILY'),
    ('DEM-FX-02','Jean','Habimana','MALE','1995-04-16'::date,'9200000000000102','250788991002',5200::numeric,'FIXED_DAILY'),
    ('DEM-FX-03','Chantal','Mutesi','FEMALE','1996-09-05'::date,'9200000000000103','250788991003',4800::numeric,'FIXED_DAILY'),
    ('DEM-FX-04','Eric','Nkurunziza','MALE','1994-12-01'::date,'9200000000000104','250788991004',5500::numeric,'FIXED_DAILY'),
    ('DEM-FX-05','Diane','Uwase','FEMALE','1998-03-03'::date,'9200000000000105','250788991005',5000::numeric,'FIXED_DAILY'),
    ('DEM-FX-06','Patrick','Nsengimana','MALE','1993-06-24'::date,'9200000000000106','250788991006',6000::numeric,'FIXED_DAILY'),
    ('DEM-FX-07','Claudine','Mukeshimana','FEMALE','1999-01-17'::date,'9200000000000107','250788991007',4500::numeric,'FIXED_DAILY'),
    ('DEM-FX-08','Samuel','Nzabonimpa','MALE','1992-07-09'::date,'9200000000000108','250788991008',6200::numeric,'FIXED_DAILY'),
    ('DEM-FX-09','Beata','Nyirabazungu','FEMALE','1997-04-11'::date,'9200000000000109','250788991009',5000::numeric,'FIXED_DAILY'),
    ('DEM-FX-10','David','Niyonkuru','MALE','1990-08-16'::date,'9200000000000110','250788991010',5300::numeric,'FIXED_DAILY'),
    ('DEM-FX-11','Olive','Iradukunda','FEMALE','1995-10-21'::date,'9200000000000111','250788991011',4700::numeric,'FIXED_DAILY'),
    ('DEM-FX-12','Isaac','Nshimiyimana','MALE','1991-05-29'::date,'9200000000000112','250788991012',5100::numeric,'FIXED_DAILY'),
    ('DEM-FL-01','Rose','Uwamahoro','FEMALE','1998-08-08'::date,'9200000000000121','250788991021',5000::numeric,'FLEXIBLE_DAILY'),
    ('DEM-FL-02','Theo','Habyarimana','MALE','1994-02-14'::date,'9200000000000122','250788991022',6000::numeric,'FLEXIBLE_DAILY'),
    ('DEM-FL-03','Mariam','Uwitonze','FEMALE','1996-11-30'::date,'9200000000000123','250788991023',4500::numeric,'FLEXIBLE_DAILY'),
    ('DEM-FL-04','Claude','Mugabo','MALE','1992-09-19'::date,'9200000000000124','250788991024',5500::numeric,'FLEXIBLE_DAILY')
  ) as workers(code,first_name,last_name,gender,birth,nid,phone,rate,payment_type)
  on conflict(employee_code) do update set company_id=excluded.company_id,position_id=excluded.position_id,manager_user_id=excluded.manager_user_id,daily_rate=excluded.daily_rate,monthly_salary=excluded.monthly_salary,is_worker=true,payment_type=excluded.payment_type,status='ACTIVE';

  -- Twelve normal workdays for 12 fixed workers (Sundays 13th and 20th excluded).
  insert into public.attendance(employee_id,company_id,manager_user_id,attendance_date,shift_type,check_in,check_out,hours_worked,overtime_hours,attendance_status,applied_daily_rate,remarks,recorded_by)
  select e.employee_id,c,manager_user,d::date,'DAY','07:00','17:00',10,0,'PRESENT',e.daily_rate,'Fixture day shift',accountant_user
  from public.employees e cross join generate_series(date '2026-09-07',date '2026-09-20',interval '1 day') d
  where e.employee_code like 'DEM-FX-%' and extract(isodow from d)<7
  on conflict(employee_id,attendance_date,shift_type) do nothing;
  -- Exactly eight fixed workers work six night shifts: three in week one and three in week two.
  insert into public.attendance(employee_id,company_id,manager_user_id,attendance_date,shift_type,check_in,check_out,hours_worked,overtime_hours,attendance_status,applied_daily_rate,remarks,recorded_by)
  select e.employee_id,c,manager_user,d::date,'NIGHT','19:00','23:00',4,0,'PRESENT',e.daily_rate+1000,'Fixture Owner-planned night shift (+1,000 RWF)',accountant_user
  from public.employees e cross join (values(date '2026-09-08'),(date '2026-09-10'),(date '2026-09-12'),(date '2026-09-15'),(date '2026-09-17'),(date '2026-09-19')) as nights(d)
  where e.employee_code in ('DEM-FX-01','DEM-FX-02','DEM-FX-03','DEM-FX-04','DEM-FX-05','DEM-FX-06','DEM-FX-07','DEM-FX-08')
  on conflict(employee_id,attendance_date,shift_type) do nothing;

  -- Flexible workers are recorded separately, not in attendance. Four day and two night entries each.
  insert into public.flexible_work_entries(company_id,manager_user_id,employee_id,work_date,shift_type,agreed_daily_rate,work_details,recorded_by)
  select c,manager_user,e.employee_id,d::date,shift,e.daily_rate + case when shift='NIGHT' then 1000 else 0 end,'Fixture flexible '||lower(shift)||' work',accountant_user
  from public.employees e cross join (values(date '2026-09-07','DAY'),(date '2026-09-09','DAY'),(date '2026-09-11','DAY'),(date '2026-09-14','DAY'),(date '2026-09-16','NIGHT'),(date '2026-09-18','NIGHT')) as work(d,shift)
  where e.employee_code like 'DEM-FL-%'
  on conflict(employee_id,work_date,shift_type) do nothing;

  -- Seven consumptions, each below the worker's earned two-week value.
  insert into public.worker_consumptions(company_id,manager_user_id,employee_id,shopkeeper_id,consumption_date,item_name,quantity,unit_price,total_amount,amount_deducted,remaining_balance,recorded_by,remarks,approval_status,shopkeeper_payment_status)
  select c,manager_user,e.employee_id,shop,x.d,x.item,x.qty,x.price,x.qty*x.price,0,x.qty*x.price,accountant_user,'Two-week fixture consumption','PENDING_MANAGER','UNPAID'
  from (values('DEM-FX-01',date '2026-09-09','Amata',2::numeric,800::numeric),('DEM-FX-02',date '2026-09-10','Ifu y''ibigori',5,700),('DEM-FX-03',date '2026-09-11','Isukari',2,1500),('DEM-FX-04',date '2026-09-14','Isabune',3,900),('DEM-FX-05',date '2026-09-15','Ibishyimbo',3,1200),('DEM-FX-06',date '2026-09-17','Amavuta',1,3500),('DEM-FX-07',date '2026-09-18','Umuceri',4,1100)) x(code,d,item,qty,price)
  join public.employees e on e.employee_code=x.code
  where not exists(select 1 from public.worker_consumptions w where w.employee_id=e.employee_id and w.remarks='Two-week fixture consumption' and w.consumption_date=x.d);

  -- Food is supplied every working day, with two line items each day.
  insert into public.food_supplies(company_id,supplier_id,manager_user_id,supply_date,notes,status,payment_status)
  select c,supplier,manager_user,d::date,'Two-week fixture food supply','PENDING_MANAGER','UNPAID'
  from generate_series(date '2026-09-07',date '2026-09-20',interval '1 day') d
  where extract(isodow from d)<7 and not exists(select 1 from public.food_supplies f where f.company_id=c and f.supply_date=d::date and f.notes='Two-week fixture food supply');
  insert into public.food_supply_items(food_supply_id,food_name,quantity,unit,unit_price)
  select f.food_supply_id,'Rice',25,'kg',1100 from public.food_supplies f where f.company_id=c and f.notes='Two-week fixture food supply' and not exists(select 1 from public.food_supply_items i where i.food_supply_id=f.food_supply_id and i.food_name='Rice');
  insert into public.food_supply_items(food_supply_id,food_name,quantity,unit,unit_price)
  select f.food_supply_id,'Beans',12,'kg',1400 from public.food_supplies f where f.company_id=c and f.notes='Two-week fixture food supply' and not exists(select 1 from public.food_supply_items i where i.food_supply_id=f.food_supply_id and i.food_name='Beans');

  -- One mineral production entry for every working day.
  insert into public.production_records(employee_id,manager_user_id,production_date,mineral_type,quantity,unit,activity_details,working_hours,remarks,recorded_by)
  select e.employee_id,manager_user,d::date,'Cassiterite',120 + extract(day from d)::numeric,'KG','Two-week fixture extraction',10,'Daily fixture production',accountant_user
  from public.employees e cross join generate_series(date '2026-09-07',date '2026-09-20',interval '1 day') d
  where e.employee_code='DEM-FX-01' and extract(isodow from d)<7 and not exists(select 1 from public.production_records p where p.employee_id=e.employee_id and p.production_date=d::date and p.remarks='Daily fixture production');

  -- Expenses/materials included for summary and approval testing; they are not paid.
  insert into public.operational_expenses(company_id,manager_user_id,expense_date,expense_category,item_name,quantity,unit,unit_price,total_amount,buyer_role,buyer_name,buyer_phone,recorded_by,approval_status,payment_status,payment_method,notes)
  select c,manager_user,x.d,x.category,x.item,x.qty,x.unit,x.price,x.qty*x.price,'ACCOUNTANT','Alice Mukamana','250788990012',accountant_user,'PENDING_MANAGER','UNPAID','SYSTEM_MOMO','Two-week fixture expense'
  from (values(date '2026-09-08','FUEL','Petrol',40::numeric,'litre',1450::numeric),(date '2026-09-11','TOOL','Spade',6,'piece',7000),(date '2026-09-15','MATERIAL','Sacks',30,'piece',500),(date '2026-09-18','EQUIPMENT','Wheelbarrow',1,'piece',85000)) x(d,category,item,qty,unit,price)
  where not exists(select 1 from public.operational_expenses o where o.company_id=c and o.expense_date=x.d and o.item_name=x.item and o.notes='Two-week fixture expense');

  -- Owner-direct workers and monthly staff exist for their separate Owner-only testing pages. No payroll/advance is created.
  insert into public.owner_direct_workers(company_id,owner_user_id,manager_user_id,full_name,national_id,momo_phone,agreement_date,agreed_amount,work_description)
  select c,owner_user,manager_user,x.name,x.nid,x.phone,x.d,x.amount,'Two-week fixture Owner direct-worker deal'
  from (values('Direct Worker One','9200000000000201','250788992001',date '2026-09-12',45000::numeric),('Direct Worker Two','9200000000000202','250788992002',date '2026-09-18',60000::numeric)) x(name,nid,phone,d,amount)
  where not exists(select 1 from public.owner_direct_workers w where w.company_id=c and w.national_id=x.nid);
  insert into public.monthly_staff(company_id,owner_user_id,staff_type,full_name,national_id,momo_phone,monthly_salary,start_date,is_private)
  values(c,owner_user,'SECURITY','Demo Security','9200000000000301','250788993001',360000,date '2026-09-01',false),(c,owner_user,'OWNER_PRIVATE','Demo Private Staff','9200000000000302','250788993002',420000,date '2026-09-01',true)
  on conflict(company_id,momo_phone) do update set monthly_salary=excluded.monthly_salary,is_active=true;
end $$;

-- Verification. Expected: 16 workers, 144 day attendance records, 48 night
-- attendance records, 24 flexible entries, 7 consumptions, 12 food supplies,
-- 12 production records, 4 expenses, and zero payroll/advance records.
select 'Workers' as item,count(*) as count from public.employees where employee_code like 'DEM-FX-%' or employee_code like 'DEM-FL-%'
union all select 'Day attendance',count(*) from public.attendance a join public.employees e on e.employee_id=a.employee_id where e.employee_code like 'DEM-FX-%' and a.shift_type='DAY'
union all select 'Night attendance',count(*) from public.attendance a join public.employees e on e.employee_id=a.employee_id where e.employee_code like 'DEM-FX-%' and a.shift_type='NIGHT'
union all select 'Flexible work',count(*) from public.flexible_work_entries f join public.employees e on e.employee_id=f.employee_id where e.employee_code like 'DEM-FL-%'
union all select 'Worker consumptions',count(*) from public.worker_consumptions where remarks='Two-week fixture consumption'
union all select 'Food supplies',count(*) from public.food_supplies where notes='Two-week fixture food supply'
union all select 'Production days',count(*) from public.production_records where remarks='Daily fixture production'
union all select 'Fixture expenses',count(*) from public.operational_expenses where notes='Two-week fixture expense';
