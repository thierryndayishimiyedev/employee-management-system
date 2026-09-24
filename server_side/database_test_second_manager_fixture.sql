-- SECOND MANAGER TEST DATA ONLY.
-- Run AFTER database_test_two_week_operational_fixture.sql.
-- It adds one more manager, one assigned accountant, 8 fixed workers, 2
-- flexible workers, attendance, night work, consumptions, supplies, minerals,
-- expenses, and one Owner direct-worker deal. It creates NO payroll/advances.
-- All records remain in the same demo company but under this manager only.

do $$
declare
  c uuid; manager_role uuid; accountant_role uuid; manager_position uuid; accountant_position uuid; miner_position uuid;
  owner_user uuid; manager_employee uuid; accountant_employee uuid; manager_user uuid; accountant_user uuid; supplier uuid; shop uuid;
  test_hash text := '$2b$10$P3oRkHoy7OOsxeVFMeTWG.AnYrqetojvGRMfkjNk4c4ICcUrt7hGa';
begin
  select company_id into c from public.companies where email='two-week.demo@cmk.example';
  if c is null then raise exception 'Run database_test_two_week_operational_fixture.sql first.'; end if;
  select user_id into owner_user from public.users where username='demo.owner';
  select role_id into manager_role from public.roles where role_name='MANAGER';
  select role_id into accountant_role from public.roles where role_name='ACCOUNTANT';
  select position_id into manager_position from public.positions where company_id=c and position_name='Demo Manager' limit 1;
  select position_id into accountant_position from public.positions where company_id=c and position_name='Demo Accountant' limit 1;
  select position_id into miner_position from public.positions where company_id=c and position_name='Demo Miner' limit 1;
  if owner_user is null or manager_role is null or accountant_role is null or miner_position is null then raise exception 'The first demo fixture is incomplete. Run it successfully first.'; end if;

  insert into public.employees(company_id,position_id,employee_code,first_name,last_name,gender,date_of_birth,national_id,phone,email,address,hire_date,monthly_salary,daily_rate)
  values(c,manager_position,'DEM-MGR-002','Grace','Uwimana','FEMALE','1987-04-20','9200000000000401','250788994001','demo.manager.two@cmk.example','Demo mine','2026-09-01',620000,20500)
  on conflict(employee_code) do update set company_id=excluded.company_id,position_id=excluded.position_id returning employee_id into manager_employee;
  insert into public.users(employee_id,role_id,username,password,is_active) values(manager_employee,manager_role,'demo.manager.two',test_hash,true)
  on conflict(username) do update set employee_id=excluded.employee_id,role_id=excluded.role_id,password=excluded.password,is_active=true returning user_id into manager_user;
  update public.employees set manager_user_id=manager_user where employee_id=manager_employee;

  insert into public.employees(company_id,position_id,manager_user_id,employee_code,first_name,last_name,gender,date_of_birth,national_id,phone,email,address,hire_date,monthly_salary,daily_rate)
  values(c,accountant_position,manager_user,'DEM-ACC-002','Ruth','Umutoni','FEMALE','1992-08-03','9200000000000402','250788994002','demo.accountant.two@cmk.example','Demo mine','2026-09-01',460000,15333)
  on conflict(employee_code) do update set company_id=excluded.company_id,position_id=excluded.position_id,manager_user_id=excluded.manager_user_id returning employee_id into accountant_employee;
  insert into public.users(employee_id,role_id,username,password,is_active) values(accountant_employee,accountant_role,'demo.accountant.two',test_hash,true)
  on conflict(username) do update set employee_id=excluded.employee_id,role_id=excluded.role_id,password=excluded.password,is_active=true returning user_id into accountant_user;

  select supplier_id into supplier from public.food_suppliers where company_id=c and active=true limit 1;
  if supplier is null then raise exception 'Demo food supplier is missing. Run the first fixture again.'; end if;
  select shopkeeper_id into shop from public.shopkeepers where company_id=c and manager_user_id=manager_user and shopkeeper_name='Demo Second Manager Shop';
  if shop is null then insert into public.shopkeepers(company_id,manager_user_id,shopkeeper_name,phone,active,created_by) values(c,manager_user,'Demo Second Manager Shop','250788994003',true,accountant_user) returning shopkeeper_id into shop; end if;

  update public.night_shift_settings set starts_at='20:00',ends_at='00:00',fixed_worker_rate_adjustment=-500,flexible_worker_rate_adjustment=500,is_active=true,configured_by=owner_user,configured_at=now() where company_id=c and manager_user_id=manager_user and is_active=true;
  if not exists(select 1 from public.night_shift_settings where company_id=c and manager_user_id=manager_user and is_active=true) then insert into public.night_shift_settings(company_id,manager_user_id,starts_at,ends_at,fixed_worker_rate_adjustment,flexible_worker_rate_adjustment,is_active,configured_by) values(c,manager_user,'20:00','00:00',-500,500,true,owner_user); end if;

  insert into public.employees(company_id,position_id,manager_user_id,employee_code,first_name,last_name,gender,date_of_birth,national_id,phone,address,hire_date,monthly_salary,daily_rate,is_worker,payment_type)
  select c,miner_position,manager_user,code,first_name,last_name,gender::public.gender_type,birth,nid,phone,'Demo mine','2026-09-01',rate*30,rate,true,payment_type
  from (values
    ('DEM2-FX-01','Alice','Niyonsaba','FEMALE','1996-03-10'::date,'9200000000000411','250788994011',4200::numeric,'FIXED_DAILY'),
    ('DEM2-FX-02','Peter','Niyigena','MALE','1993-11-07'::date,'9200000000000412','250788994012',5800::numeric,'FIXED_DAILY'),
    ('DEM2-FX-03','Vestine','Mukantwari','FEMALE','1998-05-15'::date,'9200000000000413','250788994013',4600::numeric,'FIXED_DAILY'),
    ('DEM2-FX-04','Emmanuel','Hategekimana','MALE','1991-01-22'::date,'9200000000000414','250788994014',5400::numeric,'FIXED_DAILY'),
    ('DEM2-FX-05','Solange','Uwamariya','FEMALE','1997-09-09'::date,'9200000000000415','250788994015',4900::numeric,'FIXED_DAILY'),
    ('DEM2-FX-06','Fabrice','Munyaneza','MALE','1990-02-18'::date,'9200000000000416','250788994016',6100::numeric,'FIXED_DAILY'),
    ('DEM2-FX-07','Angelique','Mukarurangwa','FEMALE','1995-07-21'::date,'9200000000000417','250788994017',4700::numeric,'FIXED_DAILY'),
    ('DEM2-FX-08','Martin','Rukundo','MALE','1994-06-12'::date,'9200000000000418','250788994018',5100::numeric,'FIXED_DAILY'),
    ('DEM2-FL-01','Nadine','Mutesi','FEMALE','1999-04-07'::date,'9200000000000421','250788994021',4800::numeric,'FLEXIBLE_DAILY'),
    ('DEM2-FL-02','Bosco','Ndayambaje','MALE','1992-10-02'::date,'9200000000000422','250788994022',5600::numeric,'FLEXIBLE_DAILY')
  ) workers(code,first_name,last_name,gender,birth,nid,phone,rate,payment_type)
  on conflict(employee_code) do update set company_id=excluded.company_id,position_id=excluded.position_id,manager_user_id=excluded.manager_user_id,daily_rate=excluded.daily_rate,monthly_salary=excluded.monthly_salary,is_worker=true,payment_type=excluded.payment_type,status='ACTIVE';

  insert into public.attendance(employee_id,company_id,manager_user_id,attendance_date,shift_type,check_in,check_out,hours_worked,overtime_hours,attendance_status,applied_daily_rate,remarks,recorded_by)
  select e.employee_id,c,manager_user,d::date,'DAY','07:00','17:00',10,0,'PRESENT',e.daily_rate,'Second manager fixture day shift',accountant_user
  from public.employees e cross join generate_series(date '2026-09-07',date '2026-09-20',interval '1 day') d
  where e.employee_code like 'DEM2-FX-%' and extract(isodow from d)<7 on conflict(employee_id,attendance_date,shift_type) do nothing;
  -- Four workers, six night shifts: a separate pattern for manager comparison.
  insert into public.attendance(employee_id,company_id,manager_user_id,attendance_date,shift_type,check_in,check_out,hours_worked,overtime_hours,attendance_status,applied_daily_rate,remarks,recorded_by)
  select e.employee_id,c,manager_user,d::date,'NIGHT','20:00','00:00',4,0,'PRESENT',e.daily_rate-500,'Second manager night shift (-500 RWF)',accountant_user
  from public.employees e cross join (values(date '2026-09-07'),(date '2026-09-09'),(date '2026-09-11'),(date '2026-09-14'),(date '2026-09-16'),(date '2026-09-18')) nights(d)
  where e.employee_code in ('DEM2-FX-01','DEM2-FX-02','DEM2-FX-03','DEM2-FX-04') on conflict(employee_id,attendance_date,shift_type) do nothing;
  insert into public.flexible_work_entries(company_id,manager_user_id,employee_id,work_date,shift_type,agreed_daily_rate,work_details,recorded_by)
  select c,manager_user,e.employee_id,d::date,shift,e.daily_rate+case when shift='NIGHT' then 500 else 0 end,'Second manager fixture flexible work',accountant_user
  from public.employees e cross join(values(date '2026-09-08','DAY'),(date '2026-09-10','DAY'),(date '2026-09-12','DAY'),(date '2026-09-15','DAY'),(date '2026-09-17','NIGHT'),(date '2026-09-19','NIGHT')) work(d,shift)
  where e.employee_code like 'DEM2-FL-%' on conflict(employee_id,work_date,shift_type) do nothing;

  insert into public.worker_consumptions(company_id,manager_user_id,employee_id,shopkeeper_id,consumption_date,item_name,quantity,unit_price,total_amount,amount_deducted,remaining_balance,recorded_by,remarks,approval_status,shopkeeper_payment_status)
  select c,manager_user,e.employee_id,shop,x.d,x.item,x.qty,x.price,x.qty*x.price,0,x.qty*x.price,accountant_user,'Second manager fixture consumption','PENDING_MANAGER','UNPAID'
  from(values('DEM2-FX-01',date '2026-09-09','Milk',2::numeric,800::numeric),('DEM2-FX-02',date '2026-09-11','Maize flour',3,700),('DEM2-FX-03',date '2026-09-15','Beans',2,1200),('DEM2-FX-04',date '2026-09-17','Cooking oil',1,3000)) x(code,d,item,qty,price)
  join public.employees e on e.employee_code=x.code where not exists(select 1 from public.worker_consumptions w where w.employee_id=e.employee_id and w.remarks='Second manager fixture consumption' and w.consumption_date=x.d);

  insert into public.food_supplies(company_id,supplier_id,manager_user_id,supply_date,notes,status,payment_status)
  select c,supplier,manager_user,d::date,'Second manager fixture food supply','PENDING_MANAGER','UNPAID' from generate_series(date '2026-09-07',date '2026-09-20',interval '1 day') d
  where extract(isodow from d)<7 and not exists(select 1 from public.food_supplies f where f.company_id=c and f.manager_user_id=manager_user and f.supply_date=d::date and f.notes='Second manager fixture food supply');
  insert into public.food_supply_items(food_supply_id,food_name,quantity,unit,unit_price)
  select f.food_supply_id,'Maize flour',18,'kg',700 from public.food_supplies f where f.company_id=c and f.manager_user_id=manager_user and f.notes='Second manager fixture food supply' and not exists(select 1 from public.food_supply_items i where i.food_supply_id=f.food_supply_id and i.food_name='Maize flour');

  insert into public.production_records(employee_id,manager_user_id,production_date,mineral_type,quantity,unit,activity_details,working_hours,remarks,recorded_by)
  select e.employee_id,manager_user,d::date,'Coltan',80+extract(day from d)::numeric,'KG','Second manager fixture extraction',10,'Second manager daily production',accountant_user
  from public.employees e cross join generate_series(date '2026-09-07',date '2026-09-20',interval '1 day') d where e.employee_code='DEM2-FX-01' and extract(isodow from d)<7 and not exists(select 1 from public.production_records p where p.employee_id=e.employee_id and p.production_date=d::date and p.remarks='Second manager daily production');

  insert into public.operational_expenses(company_id,manager_user_id,expense_date,expense_category,item_name,quantity,unit,unit_price,total_amount,buyer_role,buyer_name,buyer_phone,recorded_by,approval_status,payment_status,payment_method,notes)
  select c,manager_user,x.d,x.category,x.item,x.qty,x.unit,x.price,x.qty*x.price,'MANAGER','Grace Uwimana','250788994001',accountant_user,'PENDING_MANAGER','UNPAID','SYSTEM_MOMO','Second manager fixture expense'
  from(values(date '2026-09-10','FUEL','Diesel',30::numeric,'litre',1400::numeric),(date '2026-09-16','TOOL','Hoe',8,'piece',3500)) x(d,category,item,qty,unit,price)
  where not exists(select 1 from public.operational_expenses o where o.company_id=c and o.manager_user_id=manager_user and o.expense_date=x.d and o.item_name=x.item and o.notes='Second manager fixture expense');

  insert into public.owner_direct_workers(company_id,owner_user_id,manager_user_id,full_name,national_id,momo_phone,agreement_date,agreed_amount,work_description)
  select c,owner_user,manager_user,'Second Manager Direct Worker','9200000000000451','250788994051',date '2026-09-16',50000,'Second manager fixture direct-worker deal'
  where not exists(select 1 from public.owner_direct_workers where company_id=c and national_id='9200000000000451');
end $$;

select 'Second manager fixed workers' as item,count(*) as count from public.employees where employee_code like 'DEM2-FX-%'
union all select 'Second manager flexible workers',count(*) from public.employees where employee_code like 'DEM2-FL-%'
union all select 'Second manager day attendance',count(*) from public.attendance a join public.employees e on e.employee_id=a.employee_id where e.employee_code like 'DEM2-FX-%' and a.shift_type='DAY'
union all select 'Second manager night attendance',count(*) from public.attendance a join public.employees e on e.employee_id=a.employee_id where e.employee_code like 'DEM2-FX-%' and a.shift_type='NIGHT';
