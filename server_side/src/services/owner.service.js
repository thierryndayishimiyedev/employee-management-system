const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");

const createOwner = async (ownerData) => {

    const {
        company_id,
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

    const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("*")
        .eq("role_name", "OWNER")
        .single();

    if (roleError || !role)
        throw new Error("OWNER role not found.");

    const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .insert([{
            company_id,
            department_id: null,
            position_id: null,
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

    if (employeeError)
        throw employeeError;

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error: userError } = await supabase
        .from("users")
        .insert([{
            employee_id: employee.employee_id,
            role_id: role.role_id,
            username,
            password: hashedPassword
        }])
        .select()
        .single();

    if (userError)
        throw userError;

    delete user.password;

    return {
        employee,
        user
    };

};

const getOwners = async () => {

    const { data, error } = await supabase
        .from("users")
        .select(`
            *,
            roles(role_name),
            employees(*)
        `);

    if (error)
        throw error;

    return data.filter(user =>
        user.roles &&
        user.roles.role_name === "OWNER"
    );

};

const getOwnerById = async (id) => {

    const { data, error } = await supabase
        .from("users")
        .select(`
            *,
            roles(role_name),
            employees(*)
        `)
        .eq("user_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const updateOwner = async (id, ownerData) => {

    const {
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
        username
    } = ownerData;

    const { data: user, error: userError } = await supabase
        .from("users")
        .select("employee_id")
        .eq("user_id", id)
        .single();

    if (userError || !user)
        throw new Error("Owner not found.");

    const { error: employeeError } = await supabase
        .from("employees")
        .update({
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
        })
        .eq("employee_id", user.employee_id);

    if (employeeError)
        throw employeeError;

    if (username) {

        const { error } = await supabase
            .from("users")
            .update({
                username
            })
            .eq("user_id", id);

        if (error)
            throw error;

    }

    return await getOwnerById(id);

};

const deactivateOwner = async (id) => {

    const { data, error } = await supabase
        .from("users")
        .update({
            is_active: false
        })
        .eq("user_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

module.exports = {
    createOwner,
    getOwners,
    getOwnerById,
    updateOwner,
    deactivateOwner
};