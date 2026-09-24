const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds, resolveAuthorizedCompanyId, scopeByRelatedCompany } = require("../utils/companyScope");
const { requireManagerUserId, resolveManagerForWrite } = require("../utils/managerScope");

const codePart = (value, fallback) => String(value || fallback)
    .replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase().padEnd(3, "X");

// Accountants are employees too, but their code must never be typed manually.
// The code is unique across the company and remains stable after creation.
const generateAccountantCode = async ({ companyId, managerUserId }) => {
    const { data: manager, error: managerError } = await supabase
        .from("users")
        .select("employees!fk_user_employee!inner(first_name)")
        .eq("user_id", managerUserId)
        .single();
    if (managerError || !manager) throw new Error("Manager was not found for accountant-code generation.");
    const prefix = `${codePart(manager.employees?.first_name, "MGR")}-ACC-`;
    const { data: rows, error } = await supabase.from("employees")
        .select("employee_code")
        .eq("company_id", companyId)
        .like("employee_code", `${prefix}%`);
    if (error) throw error;
    const next = (rows || []).reduce((highest, row) => Math.max(highest, Number(String(row.employee_code || "").split("-").at(-1)) || 0), 0) + 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
};

const createAccountant = async (data, userScope) => {

    const {
        company_id,
        position_id,
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
    const scopedCompanyId = resolveAuthorizedCompanyId(userScope, company_id);
    const manager_user_id = resolveManagerForWrite(userScope, data.manager_user_id);
    if (!manager_user_id) throw new Error("A manager must be selected for this accountant.");

    const { data: manager, error: managerError } = await supabase
        .from("users")
        .select("user_id, employees!fk_user_employee!inner(company_id), roles!inner(role_name)")
        .eq("user_id", manager_user_id)
        .eq("employees.company_id", scopedCompanyId)
        .eq("roles.role_name", "MANAGER")
        .maybeSingle();
    if (managerError || !manager) throw new Error("Selected manager was not found in this company.");

    // A manager has one active accountant.  Checking this before creating the
    // employee/user pair keeps an accountant's operational data unambiguously
    // tied to one manager.
    const { data: existingAccountant, error: existingAccountantError } = await supabase
        .from("users")
        .select("user_id, employees!fk_user_employee!inner(company_id, manager_user_id), roles!inner(role_name)")
        .eq("is_active", true)
        .eq("employees.company_id", scopedCompanyId)
        .eq("employees.manager_user_id", manager_user_id)
        .eq("roles.role_name", "ACCOUNTANT")
        .maybeSingle();

    if (existingAccountantError) throw existingAccountantError;
    if (existingAccountant) {
        throw new Error("This manager already has an active accountant. Deactivate or reassign that accountant before creating another one.");
    }

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
        .eq("role_name", "ACCOUNTANT")
        .single();

    if (roleError || !role)
        throw new Error("ACCOUNTANT role not found.");

    const generatedEmployeeCode = await generateAccountantCode({ companyId: scopedCompanyId, managerUserId: manager_user_id });

    const { data: employee, error: empError } = await supabase
        .from("employees")
        .insert([{
            company_id: scopedCompanyId,
            manager_user_id,
            position_id,
            employee_code: generatedEmployeeCode,
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

const getAccountants = async (userScope) => {

    let query = supabase
        .from("users")
        .select(`
            *,
            roles(role_name),
            employees!fk_user_employee!inner(*)
        `);

    if (!isSuperAdmin(userScope)) {
        query = scopeByRelatedCompany(query, userScope);
    }
    if (["MANAGER", "ACCOUNTANT"].includes(userScope?.role_name)) {
        query = query.eq("employees.manager_user_id", requireManagerUserId(userScope));
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.filter(user =>
        user.roles &&
        user.roles.role_name === "ACCOUNTANT"
    );

};

const getAccountantById = async (id, userScope) => {

    let query = supabase
        .from("users")
        .select(`
            *,
            roles(role_name),
            employees!fk_user_employee!inner(*)
        `)
        .eq("user_id", id);

    if (!isSuperAdmin(userScope)) {
        query = scopeByRelatedCompany(query, userScope);
    }
    if (["MANAGER", "ACCOUNTANT"].includes(userScope?.role_name)) {
        query = query.eq("employees.manager_user_id", requireManagerUserId(userScope));
    }

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const updateAccountant = async (id, accountantData, userScope) => {

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
    } = accountantData;

    await getAccountantById(id, userScope);

    const { data: user, error } = await supabase
        .from("users")
        .select("employee_id")
        .eq("user_id", id)
        .single();

    if (error || !user)
        throw new Error("Accountant not found.");

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

    return await getAccountantById(id, userScope);

};

const deactivateAccountant = async (id, userScope) => {

    await getAccountantById(id, userScope);

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
    createAccountant,
    getAccountants,
    getAccountantById,
    updateAccountant,
    deactivateAccountant
};
