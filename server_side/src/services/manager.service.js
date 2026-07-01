const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");

const createManager = async (data) => {

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
    } = data;

    const { data: position } = await supabase
        .from("positions")
        .select("*")
        .eq("position_id", position_id)
        .single();

    const { data: role } = await supabase
        .from("roles")
        .select("*")
        .eq("role_name", "MANAGER")
        .single();

    const { data: employee, error: empError } = await supabase
        .from("employees")
        .insert([{
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
        }])
        .select()
        .single();

    if (empError) throw empError;

    const hash = await bcrypt.hash(password,10);

    const { data:user,error:userError } = await supabase
        .from("users")
        .insert([{
            employee_id:employee.employee_id,
            role_id:role.role_id,
            username,
            password:hash
        }])
        .select()
        .single();

    if(userError) throw userError;

    delete user.password;

    return {employee,user};

};

module.exports={createManager};