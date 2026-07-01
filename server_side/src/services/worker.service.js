const supabase = require("../config/supabase");

const createWorker = async (data) => {

    const {
        company_id,
        position_id,
        employee_code,
        first_name,
        last_name,
        gender,
        date_of_birth,
        national_id,
        phone,
        email,
        address,
        hire_date,
        monthly_salary,
        daily_rate,
        profile_photo
    } = data;

    const { data: position, error: positionError } = await supabase
        .from("positions")
        .select("*")
        .eq("position_id", position_id)
        .single();

    if (positionError || !position)
        throw new Error("Position not found.");

    const { data: employee, error } = await supabase
        .from("employees")
        .insert([
            {
                company_id,
                department_id: position.department_id,
                position_id,
                employee_code,
                first_name,
                last_name,
                gender,
                date_of_birth,
                national_id,
                phone,
                email,
                address,
                hire_date,
                monthly_salary,
                daily_rate,
                profile_photo
            }
        ])
        .select()
        .single();

    if (error) throw error;

    return employee;
};

module.exports = {
    createWorker
};