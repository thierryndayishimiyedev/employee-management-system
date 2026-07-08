const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");

const createManager = async (data, userScope) => {

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
    const scopedCompanyId = requireCompanyId(userScope) || company_id;

    const { data: position, error: positionError } = await supabase
        .from("positions")
        .select("*")
        .eq("position_id", position_id)
        .single();

    if (positionError || !position)
        throw new Error("Position not found.");

    const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("*")
        .eq("role_name", "MANAGER")
        .single();

    if (roleError || !role)
        throw new Error("MANAGER role not found.");

    const { data: employee, error: empError } = await supabase
        .from("employees")
        .insert([{
            company_id: scopedCompanyId,
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

    if (empError)
        throw empError;

    const hash = await bcrypt.hash(password, 10);

    const { data: user, error: userError } = await supabase
        .from("users")
        .insert([{
            employee_id: employee.employee_id,
            role_id: role.role_id,
            username,
            password: hash
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

const getManagers = async (userScope) => {

    let query = supabase
        .from("users")
        .select(`
            *,
            roles(role_name),
            employees!inner(*)
        `);

    if (!isSuperAdmin(userScope)) {
        query = query.eq("employees.company_id", requireCompanyId(userScope));
    }

    const { data, error } = await query;

    if (error)
        throw error;

    return data.filter(user =>
        user.roles &&
        user.roles.role_name === "MANAGER"
    );

};

const getManagerById = async (id, userScope) => {

    let query = supabase
        .from("users")
        .select(`
            *,
            roles(role_name),
            employees!inner(*)
        `)
        .eq("user_id", id);

    if (!isSuperAdmin(userScope)) {
        query = query.eq("employees.company_id", requireCompanyId(userScope));
    }

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const updateManager = async (id, managerData, userScope) => {

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
    } = managerData;

    await getManagerById(id, userScope);

    const { data: user, error } = await supabase
        .from("users")
        .select("employee_id")
        .eq("user_id", id)
        .single();

    if (error || !user)
        throw new Error("Manager not found.");

    const { error: empError } = await supabase
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

    if (empError)
        throw empError;

    if (username) {

        const { error: usernameError } = await supabase
            .from("users")
            .update({
                username
            })
            .eq("user_id", id);

        if (usernameError)
            throw usernameError;

    }

    return await getManagerById(id, userScope);

};

const deactivateManager = async (id, userScope) => {

    await getManagerById(id, userScope);

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
    createManager,
    getManagers,
    getManagerById,
    updateManager,
    deactivateManager
};
