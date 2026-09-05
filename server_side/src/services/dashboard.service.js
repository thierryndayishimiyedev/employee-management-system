const supabase = require("../config/supabase");
const { requireCompanyIds, resolveAuthorizedCompanyId } = require("../utils/companyScope");
const { requireManagerUserId } = require("../utils/managerScope");

const sum = (rows, key) => (rows || []).reduce((total, row) => total + Number(row[key] || 0), 0);
const count = (rows, predicate) => (rows || []).filter(predicate).length;

// Trend series are derived only from records already visible to the current
// company/manager scope.  We deliberately do not invent a mineral value: the
// system records extraction quantities before a selling price is known.
const dateSeries = (rows, dateKey, valueKey, predicate = () => true) => {
    const grouped = new Map();
    (rows || []).filter(predicate).forEach((row) => {
        const value = row[dateKey];
        if (!value) return;
        const date = String(value).slice(0, 10);
        grouped.set(date, (grouped.get(date) || 0) + Number(row[valueKey] || 0));
    });
    return Array.from(grouped, ([date, value]) => ({ date, value }))
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(-12);
};

const attendanceSeries = (rows) => {
    const grouped = new Map();
    (rows || []).forEach((row) => {
        if (!row.attendance_date) return;
        const date = String(row.attendance_date).slice(0, 10);
        const value = grouped.get(date) || { date, present: 0, absent: 0, hours: 0 };
        if (row.attendance_status === "PRESENT") value.present += 1;
        if (row.attendance_status === "ABSENT") value.absent += 1;
        value.hours += Number(row.hours_worked || 0);
        grouped.set(date, value);
    });
    return Array.from(grouped.values()).sort((left, right) => left.date.localeCompare(right.date)).slice(-12);
};

const isFailed = (status) => String(status || "").toUpperCase().startsWith("FAILED");
const isUnpaid = (status) => String(status || "").toUpperCase() !== "PAID";
const foodTotal = (row) => (row.food_supply_items || []).reduce((total, item) => total + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);

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
        records("worker_consumptions", "consumption_id,manager_user_id,item_name,total_amount,remaining_balance,consumption_date,approval_status,shopkeeper_payment_status,created_at", companyIds, managerUserId),
        records("payments", "payment_id,manager_user_id,amount,payment_status,failure_reason,paid_at", companyIds, managerUserId),
        records("reports", "report_id,manager_user_id,report_date,status", companyIds, managerUserId),
        records("food_supplies", "food_supply_id,manager_user_id,status,payment_status,supply_date,created_at,food_supply_items(quantity,unit_price)", companyIds, managerUserId),
        records("operational_expenses", "expense_id,manager_user_id,expense_date,expense_category,item_name,quantity,total_amount,approval_status,payment_status,created_at", companyIds, managerUserId)
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
    const foodPending = food.filter(row => row.status === "OWNER_APPROVED" && isUnpaid(row.payment_status));
    const consumptionReady = consumptions.filter(row => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.shopkeeper_payment_status));
    const ownerApprovals = [
        ...payroll.filter(row => row.approval_status === "GENERATED").map(row => ({ type: "Payroll", date: row.generated_at, status: "PENDING_MANAGER", amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...payroll.filter(row => row.approval_status === "MANAGER_APPROVED").map(row => ({ type: "Payroll", date: row.generated_at, status: row.approval_status, amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...advances.filter(row => row.status === "PENDING_MANAGER").map(row => ({ type: "Advance", date: row.request_date, status: row.status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id })),
        ...advances.filter(row => row.status === "PENDING_OWNER").map(row => ({ type: "Advance", date: row.request_date, status: row.status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id })),
        ...expenses.filter(row => row.approval_status === "PENDING_MANAGER").map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...expenses.filter(row => row.approval_status === "PENDING_OWNER").map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...food.filter(row => row.status === "PENDING_MANAGER").map(row => ({ type: "Food supply", date: row.created_at || row.supply_date, status: row.status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...food.filter(row => row.status === "PENDING_OWNER").map(row => ({ type: "Food supply", date: row.created_at || row.supply_date, status: row.status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...consumptions.filter(row => row.approval_status === "PENDING_MANAGER").map(row => ({ type: "Shopkeeper payment", date: row.created_at || row.consumption_date, status: row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...consumptions.filter(row => row.approval_status === "PENDING_OWNER").map(row => ({ type: "Shopkeeper payment", date: row.created_at || row.consumption_date, status: row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name }))
    ].sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
    const readyPayments = [
        ...payroll.filter(row => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.payment_status)).map(row => ({ type: "Payroll", date: row.generated_at, status: row.payment_status, amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...advances.filter(row => row.status === "OWNER_APPROVED" && isUnpaid(row.payment_status)).map(row => ({ type: "Advance", date: row.request_date, status: row.payment_status, amount: Number(row.remaining_balance || row.amount || 0), manager_user_id: row.manager_user_id })),
        ...expenses.filter(row => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.payment_status)).map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.payment_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...foodPending.map(row => ({ type: "Food supplier", date: row.created_at || row.supply_date, status: row.payment_status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...consumptionReady.map(row => ({ type: "Shopkeeper", date: row.created_at || row.consumption_date, status: row.shopkeeper_payment_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name }))
    ].sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
    const failedPayments = [
        ...payments.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Payment", date: row.paid_at, status: row.payment_status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id, reason: row.failure_reason })),
        ...payroll.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Payroll", date: row.generated_at, status: row.payment_status, amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...advances.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Advance", date: row.request_date, status: row.payment_status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id })),
        ...expenses.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.payment_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...food.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Food supplier", date: row.created_at || row.supply_date, status: row.payment_status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...consumptions.filter(row => isFailed(row.shopkeeper_payment_status)).map(row => ({ type: "Shopkeeper", date: row.created_at || row.consumption_date, status: row.shopkeeper_payment_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name }))
    ].sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
    const activity = [
        ...payroll.map(row => ({ type: "Payroll", date: row.generated_at, status: row.payment_status || row.approval_status, amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...advances.map(row => ({ type: "Advance", date: row.request_date, status: row.payment_status || row.status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id })),
        ...expenses.map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.payment_status || row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...food.map(row => ({ type: "Food supply", date: row.created_at || row.supply_date, status: row.payment_status || row.status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...consumptions.map(row => ({ type: "Shopkeeper consumption", date: row.created_at || row.consumption_date, status: row.shopkeeper_payment_status || row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...production.map(row => ({ type: "Production", date: row.production_date, status: "RECORDED", quantity: Number(row.quantity || 0), manager_user_id: row.manager_user_id }))
    ].sort((left, right) => String(right.date || "").localeCompare(String(left.date || ""))).slice(0, 30);
    return {
        counts: { workers: employees.length, attendance_today: count(attendance, row => row.attendance_date === today), present_today: count(attendance, row => row.attendance_date === today && row.attendance_status === "PRESENT"), absent_today: count(attendance, row => row.attendance_date === today && row.attendance_status === "ABSENT"), reports_waiting: count(reports, row => row.status === "PENDING_MANAGER"), pending_approvals: ownerApprovals.length, ready_payments: readyPayments.length, failed_payments: failedPayments.length },
        financial: { payroll_pending: sum(payroll.filter(row => isUnpaid(row.payment_status)), "net_salary"), payroll_approved: sum(payroll.filter(row => row.approval_status === "OWNER_APPROVED"), "net_salary"), payroll_paid: sum(payroll.filter(row => row.payment_status === "PAID"), "net_salary"), advances_pending: sum(advances.filter(row => !["OWNER_APPROVED", "PAID"].includes(row.status)), "amount"), advances_approved: sum(advances.filter(row => row.status === "OWNER_APPROVED"), "amount"), advances_paid: sum(advances.filter(row => row.payment_status === "PAID"), "amount_paid"), consumption_total: sum(consumptions, "total_amount"), consumption_outstanding: sum(consumptions, "remaining_balance"), shopkeeper_ready_to_pay: sum(consumptionReady, "total_amount"), food_total: food.reduce((total, row) => total + foodTotal(row), 0), food_ready_to_pay: foodPending.reduce((total, row) => total + foodTotal(row), 0), food_paid: food.filter(row => row.payment_status === "PAID").reduce((total, row) => total + foodTotal(row), 0), expenses_total: sum(expenses, "total_amount"), expenses_paid: sum(expenses.filter(row => row.payment_status === "PAID"), "total_amount"), expenses_pending: sum(expenses.filter(row => isUnpaid(row.payment_status)), "total_amount"), expenses_ready_to_pay: sum(expenses.filter(row => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.payment_status)), "total_amount"), awaiting_payment: readyPayments.reduce((total, row) => total + Number(row.amount || 0), 0), failed_payments: failedPayments.reduce((total, row) => total + Number(row.amount || 0), 0), total_spent: sum(payroll.filter(row => row.payment_status === "PAID"), "net_salary") + sum(advances.filter(row => row.payment_status === "PAID"), "amount_paid") + sum(expenses.filter(row => row.payment_status === "PAID"), "total_amount") + food.filter(row => row.payment_status === "PAID").reduce((total, row) => total + foodTotal(row), 0) + sum(consumptions.filter(row => row.shopkeeper_payment_status === "PAID"), "total_amount") },
        operations: { attendance_hours: sum(attendance, "hours_worked"), overtime_hours: sum(attendance, "overtime_hours"), production_quantity: sum(production, "quantity"), production_records: production.length, production_value: productionValue, production_expenses: sum(expenses, "total_amount"), production_net: productionValue, food_supplies: food.length, material_purchases: expenses.length, equipment_quantity: sum(expenses.filter(row => ["EQUIPMENT", "TOOL"].includes(row.expense_category)), "quantity") },
        charts: {
            attendance: attendanceSeries(attendance),
            payroll: dateSeries(payroll, "generated_at", "net_salary"),
            advances: dateSeries(advances, "request_date", "amount"),
            production: dateSeries(production, "production_date", "quantity"),
            expenses: dateSeries(expenses, "expense_date", "total_amount"),
            payments: dateSeries(payments, "paid_at", "amount", row => row.payment_status === "PAID"),
            // This is intentionally null until mineral sale price/revenue is recorded.
            profit_available: false,
            profit_reason: "Profit is unavailable until mineral sale prices are recorded."
        },
        payroll_periods: Object.values(grouped), recent: { payroll: payroll.slice(-8), advances: advances.slice(-8) }, owner_tracking: { approvals: ownerApprovals, ready_payments: readyPayments, failed_payments: failedPayments, activity }
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
