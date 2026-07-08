const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");

const recordProduction = async (productionData, user) => {

    const {
        employee_id,
        production_date,
        mineral_type,
        quantity,
        unit,
        remarks
    } = productionData;

    let employeeQuery = supabase
        .from("employees")
        .select("employee_id, company_id")
        .eq("employee_id", employee_id);

    if (!isSuperAdmin(user)) {
        employeeQuery = employeeQuery.eq("company_id", requireCompanyId(user));
    }

    const { data: employee, error: employeeError } = await employeeQuery.single();

    if (employeeError || !employee)
        throw new Error("Employee not found.");

    const { data: production, error } = await supabase
        .from("production_records")
        .insert([{
            employee_id,
            production_date,
            mineral_type,
            quantity,
            unit,
            remarks
        }])
        .select()
        .single();

    if (error)
        throw error;

    return production;

};

const getProductions = async (user) => {

    let query = supabase
        .from("production_records")
        .select(`
            *,
            employees!inner(
                employee_code,
                first_name,
                last_name,
                company_id
            )
        `)
        .order("production_date", {
            ascending: false
        });

    if (!isSuperAdmin(user)) {
        query = query.eq("employees.company_id", requireCompanyId(user));
    }

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getProductionById = async (id, user) => {

    let query = supabase
        .from("production_records")
        .select(`
            *,
            employees!inner(
                employee_code,
                first_name,
                last_name,
                company_id
            )
        `)
        .eq("production_id", id);

    if (!isSuperAdmin(user)) {
        query = query.eq("employees.company_id", requireCompanyId(user));
    }

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const updateProduction = async (id, productionData, user) => {

    await getProductionById(id, user);

    const { data, error } = await supabase
        .from("production_records")
        .update(productionData)
        .eq("production_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const deleteProduction = async (id, user) => {

    await getProductionById(id, user);

    const { error } = await supabase
        .from("production_records")
        .delete()
        .eq("production_id", id);

    if (error)
        throw error;

    return true;

};

module.exports = {
    recordProduction,
    getProductions,
    getProductionById,
    updateProduction,
    deleteProduction
};
