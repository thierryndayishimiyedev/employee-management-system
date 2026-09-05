const supabase = require("../config/supabase");
const { requireCompanyIds, resolveAuthorizedCompanyId } = require("../utils/companyScope");
const { requireManagerUserId } = require("../utils/managerScope");

const sum = (rows, key) => (rows || []).reduce((total, row) => total + Number(row[key] || 0), 0);
const count = (rows, predicate) => (rows || []).filter(predicate).length;

const records = async (table, fields, companyIds, managerUserId = null) => {
    let query = supabase.from(table).select(fields).in("company_id", companyIds);
    if (managerUserId) query = query.eq("manager_user_id", managerUserId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

const advanceRecords = async (companyIds, managerUserId = null) => {
    let query = supabase.from("salary_advances")
        .select("advance_id,manager_user_id,amount,amount_paid,remaining_balance,status,payment_status,request_date,employees!inner(company_id)")
        .in("employees.company_id", companyIds);
    if (managerUserId) query = query.eq("manager_user_id", managerUserId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

const productionRecords = async (companyIds, managerUserId = null) => {
    let query = supabase.from("production_records")
        .select("production_id,manager_user_id,production_date,quantity,employees!inner(company_id)")
        .in("employees.company_id", companyIds);
    if (managerUserId) query = query.eq("manager_user_id", managerUserId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

const workerRecords = async (companyIds, managerUserId = null) => {
    let query = supabase.from("employees")
        .select("employee_id,company_id,manager_user_id,status")
        .in("company_id", companyIds)
        .eq("is_worker", true);
    if (managerUserId) query = query.eq("manager_user_id", managerUserId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

const getManagers = async (companyIds) => {
    const { data, error } = await supabase.from("users")
        .select("user_id, username, employees!fk_user_employee!inner(company_id,first_name,last_name), roles!inner(role_name)")
        .in("employees.company_id", companyIds)
        .eq("roles.role_name", "MANAGER");
    if (error) throw error;
    return (data || []).map((item) => ({
        user_id: item.user_id,
        company_id: item.employees.company_id,
        name: [item.employees.first_name, item.employees.last_name].filter(Boolean).join(" ") || item.username
    }));
};

const aggregate = async (companyIds, managerUserId = null) => {
    const [employees, attendance, payroll, advances, production, consumptions, payments, reports, food, expenses] = await Promise.all([
        workerRecords(companyIds, managerUserId),
        records("attendance", "attendance_date,attendance_status,hours_worked,overtime_hours,manager_user_id", companyIds, managerUserId),
        records("payroll", "payroll_id,manager_user_id,payroll_period_start,payroll_period_end,payroll_month,payroll_year,basic_salary,net_salary,advance_deduction,consumption_deduction,approval_status,payment_status,generated_at", companyIds, managerUserId),
        advanceRecords(companyIds, managerUserId),
        productionRecords(companyIds, managerUserId),
        records("worker_consumptions", "consumption_id,manager_user_id,total_amount,remaining_balance,consumption_date", companyIds, managerUserId),
        records("payments", "payment_id,manager_user_id,amount,payment_status,failure_reason,paid_at", companyIds, managerUserId),
        records("reports", "report_id,manager_user_id,report_date,status", companyIds, managerUserId),
        records("food_supplies", "food_supply_id,manager_user_id,status,payment_status,supply_date", companyIds, managerUserId),
        records("operational_expenses", "expense_id,manager_user_id,expense_date,expense_category,quantity,total_amount,approval_status,payment_status", companyIds, managerUserId)
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const productionValue = 0; // Production is measured, not priced, at extraction time.
    const grouped = {};
    payroll.forEach((row) => {
        const period = row.payroll_period_start && row.payroll_period_end ? `${row.payroll_period_start}:${row.payroll_period_end}` : `${row.payroll_year}-${row.payroll_month}`;
        const key = `${row.manager_user_id}:${period}`;
        const item = grouped[key] || { manager_user_id: row.manager_user_id, period_start: row.payroll_period_start, period_end: row.payroll_period_end, payroll_month: row.payroll_month, payroll_year: row.payroll_year, employees: 0, gross_salary: 0, advance_deduction: 0, consumption_deduction: 0, net_salary: 0, approval_status: row.approval_status, payment_status: row.payment_status };
        item.employees += 1; item.gross_salary += Number(row.basic_salary || 0); item.advance_deduction += Number(row.advance_deduction || 0); item.consumption_deduction += Number(row.consumption_deduction || 0); item.net_salary += Number(row.net_salary || 0); grouped[key] = item;
    });
    return {
        counts: { workers: employees.length, attendance_today: count(attendance, row => row.attendance_date === today), present_today: count(attendance, row => row.attendance_date === today && row.attendance_status === "PRESENT"), absent_today: count(attendance, row => row.attendance_date === today && row.attendance_status === "ABSENT"), reports_waiting: count(reports, row => row.status === "PENDING_MANAGER"), pending_approvals: count(payroll, row => ["GENERATED", "MANAGER_APPROVED"].includes(row.approval_status)) + count(advances, row => ["PENDING_MANAGER", "PENDING_OWNER"].includes(row.status)) + count(expenses, row => ["PENDING_MANAGER", "PENDING_OWNER"].includes(row.approval_status)) },
        financial: { payroll_pending: sum(payroll.filter(row => row.payment_status !== "PAID"), "net_salary"), payroll_approved: sum(payroll.filter(row => row.approval_status === "OWNER_APPROVED"), "net_salary"), payroll_paid: sum(payroll.filter(row => row.payment_status === "PAID"), "net_salary"), advances_pending: sum(advances.filter(row => !["OWNER_APPROVED", "PAID"].includes(row.status)), "amount"), advances_approved: sum(advances.filter(row => row.status === "OWNER_APPROVED"), "amount"), advances_paid: sum(advances.filter(row => row.payment_status === "PAID"), "amount_paid"), consumption_total: sum(consumptions, "total_amount"), consumption_outstanding: sum(consumptions, "remaining_balance"), expenses_total: sum(expenses, "total_amount"), expenses_paid: sum(expenses.filter(row => row.payment_status === "PAID"), "total_amount"), expenses_pending: sum(expenses.filter(row => row.payment_status !== "PAID"), "total_amount"), expenses_ready_to_pay: sum(expenses.filter(row => row.approval_status === "OWNER_APPROVED" && row.payment_status !== "PAID"), "total_amount"), awaiting_payment: sum(payroll.filter(row => row.approval_status === "OWNER_APPROVED" && row.payment_status !== "PAID"), "net_salary") + sum(advances.filter(row => row.status === "OWNER_APPROVED" && row.payment_status !== "PAID"), "remaining_balance") + sum(expenses.filter(row => row.approval_status === "OWNER_APPROVED" && row.payment_status !== "PAID"), "total_amount"), failed_payments: sum(payments.filter(row => String(row.payment_status).startsWith("FAILED")), "amount") + sum(expenses.filter(row => row.payment_status === "FAILED"), "total_amount"), total_spent: sum(payroll.filter(row => row.payment_status === "PAID"), "net_salary") + sum(advances.filter(row => row.payment_status === "PAID"), "amount_paid") + sum(expenses.filter(row => row.payment_status === "PAID"), "total_amount") },
        operations: { attendance_hours: sum(attendance, "hours_worked"), overtime_hours: sum(attendance, "overtime_hours"), production_quantity: sum(production, "quantity"), production_records: production.length, production_value: productionValue, production_expenses: sum(expenses, "total_amount"), production_net: productionValue, food_supplies: food.length, material_purchases: expenses.length, equipment_quantity: sum(expenses.filter(row => ["EQUIPMENT", "TOOL"].includes(row.expense_category)), "quantity") },
        payroll_periods: Object.values(grouped), recent: { payroll: payroll.slice(-8), advances: advances.slice(-8) }
    };
};

const getOwnerDashboard = async (user, filters = {}) => {
    const assigned = requireCompanyIds(user);
    const companyIds = filters.company_id ? [resolveAuthorizedCompanyId(user, filters.company_id)] : assigned;
    const managers = (await getManagers(companyIds));
    const managerId = filters.manager_user_id || null;
    if (managerId && !managers.some(manager => manager.user_id === managerId)) throw new Error("Selected manager is not assigned to your company.");
    const data = await aggregate(companyIds, managerId);
    const { data: accountants, error } = await supabase.from("users").select("user_id,employees!fk_user_employee!inner(company_id,manager_user_id),roles!inner(role_name)").in("employees.company_id", companyIds).eq("roles.role_name", "ACCOUNTANT");
    if (error) throw error;
    const comparison = managerId ? [] : await Promise.all(managers.map(async (manager) => {
        const totals = await aggregate(companyIds, manager.user_id);
        return { manager_user_id: manager.user_id, manager_name: manager.name, workers: totals.counts.workers, payroll_paid: totals.financial.payroll_paid, advances_paid: totals.financial.advances_paid, worker_items: totals.financial.consumption_total, expenses_paid: totals.financial.expenses_paid, minerals_extracted: totals.operations.production_quantity, total_spent: totals.financial.total_spent };
    }));
    return { ...data, total_companies: companyIds.length, total_managers: managerId ? 1 : managers.length, total_accountants: (accountants || []).filter(row => !managerId || row.employees.manager_user_id === managerId).length, managers, comparison, selected_manager_user_id: managerId };
};

const getManagerDashboard = async (user) => aggregate(requireCompanyIds(user), requireManagerUserId(user));
const getAccountantDashboard = async (user) => aggregate(requireCompanyIds(user), requireManagerUserId(user));
module.exports = { getOwnerDashboard, getAccountantDashboard, getManagerDashboard };
