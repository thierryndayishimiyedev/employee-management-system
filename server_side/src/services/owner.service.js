const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");

const createOwner = async (ownerData) => {

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
        profile_photo,
        username,
        password
    } = ownerData;

    // Find Position

    const { data: position, error: positionError } = await supabase
        .from("positions")
        .select("*")
        .eq("position_id", position_id)
        .single();

    if (positionError || !position) {
        throw new Error("Position not found.");
    }

    // Find OWNER Role

    const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("*")
        .eq("role_name", "OWNER")
        .single();

    if (roleError || !role) {
        throw new Error("OWNER role not found.");
    }

    // Create Employee

    const { data: employee, error: employeeError } = await supabase
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

    if (employeeError) {
        throw employeeError;
    }

    // Hash Password

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User

    const { data: user, error: userError } = await supabase
        .from("users")
        .insert([
            {
                employee_id: employee.employee_id,
                role_id: role.role_id,
                username,
                password: hashedPassword
            }
        ])
        .select()
        .single();

    if (userError) {
        throw userError;
    }

    delete user.password;

    return {
        employee,
        user
    };

};

module.exports = {
    createOwner
};