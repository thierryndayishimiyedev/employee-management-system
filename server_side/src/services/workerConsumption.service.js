const { randomUUID } = require('crypto');
const supabase = require('../config/supabase');
const { isSuperAdmin, requireCompanyIds } = require('../utils/companyScope');
const { scopeByManager, assertEmployeeManager } = require('../utils/managerScope');
const { getPaymentProvider } = require('./paymentProviders');
const validPhone = (phone) => /^(?:\+?2507[2389]\d{7}|07[2389]\d{7})$/.test(String(phone || '').replace(/[^\d+]/g, ''));

const getConsumptions = async (user) => { let q = supabase.from('worker_consumptions').select('*, employees!inner(employee_code, first_name, last_name, company_id, manager_user_id), shopkeepers(shopkeeper_name, phone)').order('consumption_date', { ascending: false }); if (!isSuperAdmin(user)) q = q.in('company_id', requireCompanyIds(user)); q = scopeByManager(q, user); const { data, error } = await q; if (error) throw error; return data || []; };
const getConsumption = async (id, user) => { const row = (await getConsumptions(user)).find((item) => item.consumption_id === id); if (!row) throw new Error('Worker item not found in your management scope.'); return row; };
const resolveConsumptionContext = async ({ employee_id, shopkeeper_id, consumption_date }, user) => {
  if (!employee_id || !shopkeeper_id || !consumption_date) throw new Error('Worker, shopkeeper, and consumption date are required.');
  let eq = supabase.from('employees').select('employee_id, company_id, manager_user_id, is_worker, payment_type, daily_rate').eq('employee_id', employee_id); if (!isSuperAdmin(user)) eq = eq.in('company_id', requireCompanyIds(user)); const { data: employee, error } = await eq.single(); if (error || !employee || !employee.is_worker) throw new Error('Worker not found for your company.'); assertEmployeeManager(employee, user);
  let sq = supabase.from('shopkeepers').select('*').eq('shopkeeper_id', shopkeeper_id).eq('active', true); if (!isSuperAdmin(user)) sq = sq.in('company_id', requireCompanyIds(user)); sq = scopeByManager(sq, user); const { data: shop, error: shopError } = await sq.single(); if (shopError || !shop || shop.manager_user_id !== employee.manager_user_id) throw new Error('Select an active shopkeeper assigned to this worker’s manager.');
  return { employee, shop };
};
const normalizeItems = (items) => {
  if (!Array.isArray(items) || !items.length || items.length > 50) throw new Error('Add between 1 and 50 worker items before saving.');
  return items.map((item, index) => {
    const itemName = String(item?.item_name || '').trim(); const quantity = Number(item?.quantity); const unitPrice = Number(item?.unit_price);
    if (!itemName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Item row ${index + 1} needs a name, positive quantity, and valid unit price.`);
    const total = Number((quantity * unitPrice).toFixed(2));
    return { item_name: itemName, quantity, unit_price: unitPrice, total_amount: total, remaining_balance: total, remarks: String(item?.remarks || '').trim() || null };
  });
};
const availableWorkerConsumptionCredit = async (employee, user) => {
  // Only earnings from days that have not entered any payroll can support shop
  // items. This prevents a worker from consuming money that has already been paid.
  if (employee.payment_type === 'FLEXIBLE_DAILY') {
    let workQuery = supabase.from('flexible_work_entries').select('agreed_daily_rate,payroll_id').eq('employee_id', employee.employee_id).is('payroll_id', null);
    const { data, error } = await workQuery; if (error) throw error;
    return (data || []).reduce((sum, row) => sum + Number(row.agreed_daily_rate || 0), 0);
  }
  const { data: payroll, error: payrollError } = await supabase.from('payroll').select('payroll_period_start,payroll_period_end').eq('employee_id', employee.employee_id);
  if (payrollError) throw payrollError;
  let attendanceQuery = supabase.from('attendance').select('attendance_date,attendance_status').eq('employee_id', employee.employee_id).in('attendance_status', ['PRESENT', 'LATE']);
  const { data: attendance, error: attendanceError } = await attendanceQuery; if (attendanceError) throw attendanceError;
  const unpaidDays = (attendance || []).filter((row) => !(payroll || []).some((period) => period.payroll_period_start && period.payroll_period_end && row.attendance_date >= period.payroll_period_start && row.attendance_date <= period.payroll_period_end));
  return unpaidDays.length * Number(employee.daily_rate || 0);
};
const workerConsumptionCapacity = async (employee, user) => {
  const earned = await availableWorkerConsumptionCredit(employee, user);
  const { data, error } = await supabase.from('worker_consumptions').select('total_amount,remaining_balance').eq('employee_id', employee.employee_id).neq('approval_status', 'CHANGES_REQUESTED');
  if (error) throw error;
  const committed = (data || []).reduce((sum, row) => sum + Number(row.remaining_balance ?? row.total_amount ?? 0), 0);
  return { earned, committed, available: Math.max(0, earned - committed) };
};
const recordConsumptionsBatch = async ({ employee_id, shopkeeper_id, consumption_date, items }, user) => {
  const { employee } = await resolveConsumptionContext({ employee_id, shopkeeper_id, consumption_date }, user);
  const normalizedItems = normalizeItems(items);
  const capacity = await workerConsumptionCapacity(employee, user);
  const requested = normalizedItems.reduce((sum, item) => sum + item.total_amount, 0);
  if (requested > capacity.available + 0.001) throw new Error(`Worker items cannot exceed unpaid earned value. Earned and not yet used in payroll: ${capacity.earned} RWF; existing item debt: ${capacity.committed} RWF; available to consume: ${capacity.available} RWF; requested: ${requested} RWF.`);
  const inserts = normalizedItems.map((item) => ({ company_id: employee.company_id, manager_user_id: employee.manager_user_id, employee_id, shopkeeper_id, consumption_date, ...item, recorded_by: user.user_id, approval_status: 'PENDING_MANAGER', shopkeeper_payment_status: 'UNPAID' }));
  const { data, error } = await supabase.from('worker_consumptions').insert(inserts).select(); if (error) throw error;
  return { rows: data || [], item_count: inserts.length, total_amount: inserts.reduce((sum, item) => sum + item.total_amount, 0) };
};
const recordConsumption = async (payload, user) => {
  const result = await recordConsumptionsBatch({ ...payload, items: [{ item_name: payload.item_name, quantity: payload.quantity, unit_price: payload.unit_price, remarks: payload.remarks }] }, user);
  return result.rows[0];
};
const getConsumptionCapacity = async (employee_id, user) => {
  let query = supabase.from('employees').select('employee_id,company_id,manager_user_id,is_worker,payment_type,daily_rate').eq('employee_id', employee_id);
  if (!isSuperAdmin(user)) query = query.in('company_id', requireCompanyIds(user));
  const { data: employee, error } = await query.single();
  if (error || !employee || !employee.is_worker) throw new Error('Worker not found for your company.');
  assertEmployeeManager(employee, user);
  return workerConsumptionCapacity(employee, user);
};
const reviewConsumption = async (id, decision, comments, user) => { const item = await getConsumption(id, user); const now = new Date().toISOString(); let update; if (user.role_name === 'MANAGER') { if (!['PENDING_MANAGER', 'CHANGES_REQUESTED'].includes(item.approval_status)) throw new Error('This item is not awaiting manager approval.'); update = decision === 'approve' ? { approval_status: 'PENDING_OWNER', manager_approved_by: user.user_id, manager_approved_at: now } : { approval_status: 'CHANGES_REQUESTED', approval_comments: comments || 'Changes requested' }; } else if (user.role_name === 'OWNER') { if (item.approval_status !== 'PENDING_OWNER') throw new Error('Manager approval is required first.'); update = decision === 'approve' ? { approval_status: 'OWNER_APPROVED', owner_approved_by: user.user_id, owner_approved_at: now } : { approval_status: 'CHANGES_REQUESTED', approval_comments: comments || 'Changes requested' }; } else throw new Error('Only manager or owner can approve worker items.'); const { data, error } = await supabase.from('worker_consumptions').update(update).eq('consumption_id', id).select().single(); if (error) throw error; return data; };
const payConsumption = async (id, user) => { if (user.role_name !== 'OWNER' && !isSuperAdmin(user)) throw new Error('Only the owner can pay a shopkeeper.'); const item = await getConsumption(id, user); if (item.approval_status !== 'OWNER_APPROVED' || item.shopkeeper_payment_status === 'PAID') throw new Error('Only owner-approved, unpaid worker items can be paid.'); if (!validPhone(item.shopkeepers?.phone)) throw new Error('The shopkeeper has no valid payment phone number.'); const { data: existing } = await supabase.from('shopkeeper_payments').select('shopkeeper_payment_id').eq('consumption_id', id).maybeSingle(); if (existing) throw new Error('This worker item has already been paid.'); const reference = `SHOP-${randomUUID()}`; const transaction = await getPaymentProvider().processPayment({ reference_id: reference, amount: Number(item.total_amount), phone: item.shopkeepers.phone }); const now = new Date().toISOString(); const { error: paymentError } = await supabase.from('shopkeeper_payments').insert([{ consumption_id: id, shopkeeper_id: item.shopkeeper_id, company_id: item.company_id, amount: item.total_amount, payment_status: 'PAID', provider_name: 'INTERNAL_TEST', transaction_reference: transaction.reference_id || reference, provider_response: transaction, paid_by: user.user_id, paid_at: now }]); if (paymentError) throw paymentError; const { data, error } = await supabase.from('worker_consumptions').update({ approval_status: 'PAID', shopkeeper_payment_status: 'PAID', shopkeeper_payment_reference: transaction.reference_id || reference, paid_at: now }).eq('consumption_id', id).select().single(); if (error) throw error; return data; };
const payAllConsumptions = async ({ manager_user_id } = {}, user) => { if (user.role_name !== 'OWNER' && !isSuperAdmin(user)) throw new Error('Only the owner can pay shopkeepers.'); const eligible = (await getConsumptions(user)).filter((row) => row.approval_status === 'OWNER_APPROVED' && row.shopkeeper_payment_status !== 'PAID' && (!manager_user_id || row.manager_user_id === manager_user_id)); const failed = []; let paid = 0; for (const row of eligible) { try { await payConsumption(row.consumption_id, user); paid += 1; } catch (error) { failed.push({ consumption_id: row.consumption_id, message: error.message }); } } return { total: eligible.length, paid, failed }; };
module.exports = { recordConsumption, recordConsumptionsBatch, getConsumptionCapacity, getConsumptions, reviewConsumption, payConsumption, payAllConsumptions };
