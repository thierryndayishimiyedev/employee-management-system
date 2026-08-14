const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds, scopeByCompany } = require("../utils/companyScope");

const recordConsumption = async (payload, user) => {
    const { employee_id, consumption_date, item_name, quantity = 1, unit_price, remarks } = payload;
    if (!employee_id || !consumption_date || !item_name?.trim() || Number(quantity) <= 0 || Number(unit_price) < 0) throw new Error("Employee, date, item, positive quantity, and valid price are required.");
    let employeeQuery = supabase.from("employees").select("employee_id, company_id").eq("employee_id", employee_id);
    if (!isSuperAdmin(user)) employeeQuery = employeeQuery.in("company_id", requireCompanyIds(user));
    const { data: employee, error } = await employeeQuery.single(); if (error || !employee) throw new Error("Employee not found for your company.");
    const total = Number((Number(quantity) * Number(unit_price)).toFixed(2));
    const { data, error: insertError } = await supabase.from("worker_consumptions").insert([{
        company_id: employee.company_id, employee_id, consumption_date, item_name: item_name.trim(), quantity: Number(quantity), unit_price: Number(unit_price), total_amount: total, remaining_balance: total, recorded_by: user.user_id, remarks: remarks || null
    }]).select().single(); if (insertError) throw insertError; return data;
};

const getConsumptions = async (user) => {
    let query = supabase.from("worker_consumptions").select("*, employees!inner(employee_code, first_name, last_name, company_id)").order("consumption_date", { ascending: false });
    if (!isSuperAdmin(user)) query = query.in("company_id", requireCompanyIds(user));
    const { data, error } = await query; if (error) throw error; return data || [];
};

module.exports = { recordConsumption, getConsumptions };
