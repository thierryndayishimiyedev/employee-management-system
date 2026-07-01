const supabase = require("../config/supabase");

const recordProduction = async (productionData, user) => {

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
        .select("company_id")
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

    if (error) throw error;

    return production;
};

module.exports = { recordProduction };