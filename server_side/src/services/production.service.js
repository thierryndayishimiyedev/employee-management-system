const supabase = require("../config/supabase");

const recordProduction = async (productionData) => {

    const {
        employee_id,
        production_date,
        mineral_type,
        quantity,
        unit,
        remarks
    } = productionData;

    const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("employee_id")
        .eq("employee_id", employee_id)
        .single();

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

const getProductions = async () => {

    const { data, error } = await supabase
        .from("production_records")
        .select(`
            *,
            employees(
                employee_code,
                first_name,
                last_name
            )
        `)
        .order("production_date", {
            ascending: false
        });

    if (error)
        throw error;

    return data;

};

const getProductionById = async (id) => {

    const { data, error } = await supabase
        .from("production_records")
        .select(`
            *,
            employees(
                employee_code,
                first_name,
                last_name
            )
        `)
        .eq("production_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const updateProduction = async (id, productionData) => {

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

const deleteProduction = async (id) => {

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