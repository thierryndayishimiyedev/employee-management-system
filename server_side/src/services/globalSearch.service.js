const supabase = require('../config/supabase');
const { isSuperAdmin, requireCompanyIds, scopeByCompany, scopeByRelatedCompany } = require('../utils/companyScope');
const { scopeByManager } = require('../utils/managerScope');

const termOf = (value) => String(value || '').trim().replace(/[,%()]/g, ' ');
const nameOf = (row) => [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim();
const applyRequestedManager = (query, user, managerId, column = 'manager_user_id') => {
  if (user?.role_name === 'OWNER' && managerId) return query.eq(column, managerId);
  return scopeByManager(query, user, column);
};

const search = async ({ q, manager_user_id } = {}, user) => {
  const term = termOf(q);
  if (term.length < 2) return { workers: [], payroll: [], advances: [], payments: [], flexible_work: [] };
  const pattern = `%${term}%`;
  let workersQuery = scopeByCompany(supabase.from('employees').select('employee_id,employee_code,first_name,last_name,phone,national_id,manager_user_id,payment_type,status').eq('is_worker', true).or(`first_name.ilike.${pattern},last_name.ilike.${pattern},employee_code.ilike.${pattern},phone.ilike.${pattern},national_id.ilike.${pattern}`).limit(20), user);
  workersQuery = applyRequestedManager(workersQuery, user, manager_user_id);
  const { data: workers, error: workersError } = await workersQuery;
  if (workersError) throw workersError;
  const workerIds = (workers || []).map((row) => row.employee_id);
  if (!workerIds.length) return { workers: [], payroll: [], advances: [], payments: [], flexible_work: [] };
  let payrollQuery = scopeByRelatedCompany(supabase.from('payroll').select('payroll_id,payroll_period_start,payroll_period_end,payroll_frequency,net_salary,approval_status,payment_status,employees!inner(employee_code,first_name,last_name,phone,manager_user_id,company_id)').in('employee_id', workerIds).order('generated_at', { ascending: false }).limit(20), user);
  payrollQuery = applyRequestedManager(payrollQuery, user, manager_user_id, 'employees.manager_user_id');
  let advancesQuery = scopeByRelatedCompany(supabase.from('salary_advances').select('advance_id,amount,request_date,status,payment_status,employees!inner(employee_code,first_name,last_name,phone,manager_user_id,company_id)').in('employee_id', workerIds).order('request_date', { ascending: false }).limit(20), user);
  advancesQuery = applyRequestedManager(advancesQuery, user, manager_user_id, 'employees.manager_user_id');
  let paymentsQuery = scopeByRelatedCompany(supabase.from('payments').select('payment_id,amount,payment_date,payment_status,failure_reason,reference_id,transaction_reference,employees!inner(employee_code,first_name,last_name,phone,manager_user_id,company_id)').in('employee_id', workerIds).order('payment_date', { ascending: false }).limit(20), user);
  paymentsQuery = applyRequestedManager(paymentsQuery, user, manager_user_id, 'employees.manager_user_id');
  let flexibleQuery = scopeByRelatedCompany(supabase.from('flexible_work_entries').select('flexible_work_id,work_date,agreed_daily_rate,employees!inner(employee_code,first_name,last_name,phone,manager_user_id,company_id)').in('employee_id', workerIds).order('work_date', { ascending: false }).limit(20), user);
  flexibleQuery = applyRequestedManager(flexibleQuery, user, manager_user_id, 'employees.manager_user_id');
  const results = await Promise.all([workersQuery, payrollQuery, advancesQuery, paymentsQuery, flexibleQuery]);
  const names = ['workers', 'payroll', 'advances', 'payments', 'flexible_work'];
  const output = {};
  output.workers = workers || [];
  results.slice(1).forEach((result, index) => { if (result.error) throw result.error; output[names[index + 1]] = result.data || []; });
  return output;
};

module.exports = { search };
