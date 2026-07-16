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
        username,
        password
    } = data;

    const scopedCompanyId = requireCompanyId(userScope) || company_id;

    if (!scopedCompanyId)
        throw new Error("Company is required to create a manager.");

    let positionQuery = supabase
        .from("positions")
        .select("*, departments!inner(company_id)")
        .eq("position_id", position_id);

    // A manager can only be assigned to a position in the same company.
    if (!isSuperAdmin(userScope)) {
        positionQuery = positionQuery.eq("departments.company_id", scopedCompanyId);
    }

    const { data: position, error: positionError } = await positionQuery.single();

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
            daily_rate
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
            daily_rate
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

// Company-wide staff count + payroll total, shown alongside each manager.
// There is no department table in this schema, so this is not scoped
// per-manager — it reflects totals for the whole company. production_kg
// stays null since there is no production table yet.
const getManagerOverviews = async (userScope) => {

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

    const managers = data.filter(user =>
        user.roles &&
        user.roles.role_name === "MANAGER"
    );

    if (managers.length === 0)
        return [];

    const scopedCompanyId = requireCompanyId(userScope) || managers[0].employees.company_id;

    const { data: companyEmployees, error: empError } = await supabase
        .from("employees")
        .select("employee_id, monthly_salary")
        .eq("company_id", scopedCompanyId);

    if (empError)
        throw empError;

    const staffCount = companyEmployees.length;
    const payrollTotal = companyEmployees.reduce(
        (sum, e) => sum + (Number(e.monthly_salary) || 0),
        0
    );

    return managers.map(manager => ({
        user_id: manager.user_id,
        employee_id: manager.employees.employee_id,
        name: `${manager.employees.first_name} ${manager.employees.last_name}`,
        username: manager.username,
        staff_count: staffCount,
        payroll_total: payrollTotal,
        production_kg: null
    }));

};

module.exports = {
    createManager,
    getManagers,
    getManagerById,
    updateManager,
    deactivateManager,
    getManagerOverviews
};
