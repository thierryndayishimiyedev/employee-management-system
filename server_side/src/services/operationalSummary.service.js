const supabase = require('../config/supabase');
const { requireCompanyIds } = require('../utils/companyScope');
const { requireManagerUserId, assertManagerInCompany } = require('../utils/managerScope');
const { createPdfBuffer } = require('../utils/pdfBuilder');

const n = (value) => Number(value || 0);
const total = (rows, field) => (rows || []).reduce((sum, row) => sum + n(row[field]), 0);
const iso = (value) => new Date(value).toISOString().slice(0, 10);
const rangeFrom = ({ period = 'week', start_date, end_date }) => {
  if (start_date && end_date) return { start: start_date, end: end_date };
  const end = new Date(); const start = new Date(end);
  if (period === 'day') start.setDate(end.getDate());
  else if (period === 'month') start.setDate(end.getDate() - 29);
  else if (period === 'year') start.setFullYear(end.getFullYear() - 1);
  else start.setDate(end.getDate() - 6);
  return { start: iso(start), end: iso(end) };
};
const scope = (query, companyIds, managerId) => {
  let result = query.in('company_id', companyIds);
  if (managerId) result = result.eq('manager_user_id', managerId);
  return result;
};
// salary_advances is company-scoped through its employee, not through a
// salary_advances.company_id column. Keeping this separate prevents a
// PostgREST 400 and preserves manager isolation.
const advanceScope = (companyIds, managerId, range) => {
  let query = supabase.from('salary_advances')
    .select('amount,status,employees!inner(company_id,manager_user_id)')
    .in('employees.company_id', companyIds)
    .gte('request_date', range.start)
    .lte('request_date', range.end);
  if (managerId) query = query.eq('manager_user_id', managerId);
  return query;
};
const summary = async (params, user) => {
  const companyIds = requireCompanyIds(user);
  const range = rangeFrom(params);
  let managerId = user.role_name === 'OWNER' ? params.manager_user_id || null : requireManagerUserId(user);
  if (managerId && user.role_name === 'OWNER') await assertManagerInCompany(managerId, companyIds[0]);
  const [attendanceRes, payrollRes, flexibleRes, expensesRes, foodRes, advancesRes, consumptionRes, directRes, monthlyRes] = await Promise.all([
    scope(supabase.from('attendance').select('attendance_status,applied_daily_rate,employees(daily_rate)').gte('attendance_date', range.start).lte('attendance_date', range.end), companyIds, managerId),
    scope(supabase.from('payroll').select('basic_salary,net_salary,payment_status,approval_status').gte('generated_at', `${range.start}T00:00:00Z`).lte('generated_at', `${range.end}T23:59:59Z`), companyIds, managerId),
    scope(supabase.from('flexible_work_entries').select('agreed_daily_rate').gte('work_date', range.start).lte('work_date', range.end), companyIds, managerId),
    scope(supabase.from('operational_expenses').select('total_amount,payment_status,approval_status').gte('expense_date', range.start).lte('expense_date', range.end), companyIds, managerId),
    scope(supabase.from('food_supplies').select('food_supply_items(quantity,unit_price)').gte('supply_date', range.start).lte('supply_date', range.end), companyIds, managerId),
    advanceScope(companyIds, managerId, range),
    scope(supabase.from('worker_consumptions').select('total_amount').gte('consumption_date', range.start).lte('consumption_date', range.end), companyIds, managerId),
    user.role_name === 'OWNER' && !managerId ? supabase.from('owner_direct_workers').select('agreed_amount,payment_status').in('company_id', companyIds).gte('agreement_date', range.start).lte('agreement_date', range.end) : Promise.resolve({ data: [] }),
    user.role_name === 'OWNER' && !managerId ? supabase.from('monthly_staff_payroll').select('gross_salary,net_salary,payment_status').in('company_id', companyIds).gte('created_at', `${range.start}T00:00:00Z`).lte('created_at', `${range.end}T23:59:59Z`) : Promise.resolve({ data: [] }),
  ]);
  const results = [attendanceRes, payrollRes, flexibleRes, expensesRes, foodRes, advancesRes, consumptionRes, directRes, monthlyRes];
  const failed = results.find((result) => result?.error); if (failed) throw failed.error;
  const attendanceGross = (attendanceRes.data || []).filter((r) => ['PRESENT', 'LATE'].includes(r.attendance_status)).reduce((sum, r) => sum + n(r.applied_daily_rate ?? r.employees?.daily_rate), 0);
  const fixedGross = total(payrollRes.data, 'basic_salary') || attendanceGross;
  const fixedNet = total(payrollRes.data, 'net_salary');
  const flexibleGross = total(flexibleRes.data, 'agreed_daily_rate');
  const expenseGross = total(expensesRes.data, 'total_amount');
  const foodGross = (foodRes.data || []).reduce((sum, supply) => sum + (supply.food_supply_items || []).reduce((lineTotal, item) => lineTotal + n(item.quantity) * n(item.unit_price), 0), 0);
  const advances = total(advancesRes.data, 'amount');
  const consumption = total(consumptionRes.data, 'total_amount');
  const directGross = total(directRes.data, 'agreed_amount');
  const monthlyGross = total(monthlyRes.data, 'gross_salary');
  const monthlyNet = total(monthlyRes.data, 'net_salary');
  const pending = (payrollRes.data || []).filter((r) => !['PAID'].includes(r.payment_status)).reduce((s,r)=>s+n(r.net_salary),0)
    + (expensesRes.data || []).filter((r) => r.approval_status === 'OWNER_APPROVED' && r.payment_status !== 'PAID').reduce((s,r)=>s+n(r.total_amount),0)
    + (directRes.data || []).filter((r) => r.payment_status !== 'PAID').reduce((s,r)=>s+n(r.agreed_amount),0)
    + (monthlyRes.data || []).filter((r) => r.payment_status !== 'PAID').reduce((s,r)=>s+n(r.net_salary),0);
  const lines = [
    { label: 'Fixed-worker gross salary', amount: fixedGross, note: total(payrollRes.data, 'basic_salary') ? 'Generated payroll gross' : 'Unpaid attendance value' },
    { label: 'Fixed-worker net salary', amount: fixedNet, note: 'Gross less approved deductions' },
    { label: 'Flexible-worker work value', amount: flexibleGross, note: 'Recorded actual daily amounts' },
    { label: 'Expenses and materials', amount: expenseGross, note: 'Recorded purchases' },
    { label: 'Food supplies', amount: foodGross, note: 'Recorded food supplies' },
    { label: 'Owner direct-worker agreements', amount: directGross, note: 'Owner-only records' },
    { label: 'Monthly staff gross salary', amount: monthlyGross, note: 'Owner-only monthly payroll' },
  ];
  return { range, manager_user_id: managerId, lines, totals: { gross_owner_cost: fixedGross + flexibleGross + expenseGross + foodGross + directGross + monthlyGross, net_worker_salary: fixedNet + monthlyNet, advances, worker_consumption_deduction: consumption, amount_to_pay_now: pending }, formula: 'Gross owner cost = fixed-worker gross (or unpaid attendance) + flexible work + expenses/materials + food supplies + owner-direct workers + monthly staff. Worker consumption is excluded because it is deducted from worker salary.' };
};
const pdf = async (params, user) => {
  const data = await summary(params, user);
  const { data: company } = await supabase.from('companies').select('*').in('company_id', requireCompanyIds(user)).limit(1).single();
  return createPdfBuffer({ title: 'Operational payment summary', reportNumber: `SUM-${Date.now()}`, company, generatedBy: user.username || 'System user', summary: [{ label: 'Period', value: `${data.range.start} to ${data.range.end}` }, { label: 'Gross owner cost', value: data.totals.gross_owner_cost }, { label: 'Amount to pay now', value: data.totals.amount_to_pay_now }], insights: [data.formula], columns: [{ key: 'label', label: 'Cost category', width: 32 }, { key: 'amount', label: 'Amount (RWF)', width: 18 }, { key: 'note', label: 'Calculation basis', width: 45 }], rows: data.lines.concat([{ label: 'TOTAL GROSS OWNER COST', amount: data.totals.gross_owner_cost, note: data.formula }, { label: 'AMOUNT TO PAY NOW', amount: data.totals.amount_to_pay_now, note: 'Only approved/generated unpaid records' }]) });
};
module.exports = { summary, pdf };
