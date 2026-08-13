const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds, scopeByRelatedCompany } = require("../utils/companyScope");

const assertEmployee = async (employeeId, user) => {
    let query = supabase.from("employees").select("employee_id, company_id").eq("employee_id", employeeId);
    if (!isSuperAdmin(user)) query = query.in("company_id", requireCompanyIds(user));
    const { data, error } = await query.maybeSingle();
    if (error || !data) throw new Error("Employee not found for your company.");
    return data;
};

const productionQuery = (user) => scopeByRelatedCompany(supabase.from("production_records").select(`
    *, employees!inner(employee_code, first_name, last_name, company_id),
    production_expenses(expense_id, amount, expense_date, description),
    production_workers(employee_id, working_hours, employees(employee_code, first_name, last_name))
`), user);

const enrich = (record) => {
    const gross_value = record.unit_price == null ? null : Number(record.quantity || 0) * Number(record.unit_price);
    const total_expenses = (record.production_expenses || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    return { ...record, gross_value, total_expenses, net_result: gross_value == null ? null : gross_value - total_expenses };
};

const recordProduction = async (data, user) => {
    const { employee_id, production_date, mineral_type, quantity, unit, unit_price, activity_details, working_hours, remarks, workers = [] } = data;
    if (!employee_id || !production_date || !mineral_type || Number(quantity) <= 0 || !unit) throw new Error("Employee, date, mineral, positive quantity, and unit are required.");
    if (unit_price != null && Number(unit_price) < 0) throw new Error("Unit price cannot be negative.");
    if (working_hours != null && Number(working_hours) < 0) throw new Error("Working hours cannot be negative.");
    const employee = await assertEmployee(employee_id, user);
    const { data: production, error } = await supabase.from("production_records").insert([{
        employee_id, production_date, mineral_type, quantity, unit, unit_price: unit_price ?? null,
        activity_details: activity_details || null, working_hours: working_hours ?? null, remarks: remarks || null,
        recorded_by: user.user_id || null
    }]).select().single();
    if (error) throw error;
    if (workers.length) await setProductionWorkers(production.production_id, workers, user, employee.company_id);
    return getProductionById(production.production_id, user);
};

const getProductions = async (user) => {
    const { data, error } = await productionQuery(user).order("production_date", { ascending: false });
    if (error) throw error;
    return (data || []).map(enrich);
};

const getProductionById = async (id, user) => {
    const { data, error } = await productionQuery(user).eq("production_id", id).maybeSingle();
    if (error || !data) throw new Error("Production record not found for your company.");
    return enrich(data);
};

const setProductionWorkers = async (productionId, workers, user, expectedCompanyId = null) => {
    const production = expectedCompanyId ? { employees: { company_id: expectedCompanyId } } : await getProductionById(productionId, user);
    if (!Array.isArray(workers)) throw new Error("Workers must be an array.");
    const ids = [...new Set(workers.map(w => w.employee_id).filter(Boolean))];
    for (const worker of workers) {
        if (!worker.employee_id || (worker.working_hours != null && Number(worker.working_hours) < 0)) throw new Error("Each production worker needs a valid employee and non-negative hours.");
        const employee = await assertEmployee(worker.employee_id, user);
        if (employee.company_id !== production.employees.company_id) throw new Error("Production workers must belong to the production company.");
    }
    await supabase.from("production_workers").delete().eq("production_id", productionId);
    if (ids.length) {
        const { error } = await supabase.from("production_workers").insert(workers.map(w => ({ production_id: productionId, employee_id: w.employee_id, working_hours: w.working_hours ?? null })));
        if (error) throw error;
    }
};

const addProductionExpense = async (productionId, expense, user) => {
    const production = await getProductionById(productionId, user);
    if (!expense.expense_date || !expense.description || Number(expense.amount) < 0) throw new Error("Expense date, description, and a non-negative amount are required.");
    const { data, error } = await supabase.from("production_expenses").insert([{
        production_id: productionId, company_id: production.employees.company_id, expense_date: expense.expense_date,
        description: expense.description, amount: expense.amount, recorded_by: user.user_id || null
    }]).select().single();
    if (error) throw error;
    return data;
};

const updateProduction = async (id, data, user) => {
    await getProductionById(id, user);
    const allowed = ["production_date", "mineral_type", "quantity", "unit", "unit_price", "activity_details", "working_hours", "remarks"];
    const update = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.includes(key)));
    if (update.quantity != null && Number(update.quantity) <= 0) throw new Error("Quantity must be positive.");
    if (update.unit_price != null && Number(update.unit_price) < 0) throw new Error("Unit price cannot be negative.");
    const { error } = await supabase.from("production_records").update(update).eq("production_id", id);
    if (error) throw error;
    if (data.workers) await setProductionWorkers(id, data.workers, user);
    return getProductionById(id, user);
};

const deleteProduction = async (id, user) => { await getProductionById(id, user); const { error } = await supabase.from("production_records").delete().eq("production_id", id); if (error) throw error; return true; };
module.exports = { recordProduction, getProductions, getProductionById, updateProduction, deleteProduction, addProductionExpense, setProductionWorkers };
