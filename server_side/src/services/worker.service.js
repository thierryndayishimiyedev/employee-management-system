

const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds, resolveAuthorizedCompanyId, scopeByCompany } = require("../utils/companyScope");
const { normalizeRwandaPhone } = require("../utils/rwandaPhone");

const createWorker = async (data, userScope) => {

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
        password,
        role_name
    } = data;
    const scopedCompanyId = resolveAuthorizedCompanyId(userScope, company_id);
    const parsedDailyRate = Number(daily_rate);
    if (!Number.isFinite(parsedDailyRate) || parsedDailyRate <= 0) {
        throw new Error("Daily payment must be greater than zero.");
    }
    // Payroll uses a fixed 30-day policy.  Keep the existing monthly_salary column
    // in sync instead of asking an accountant to enter two conflicting amounts.
    const resolvedMonthlySalary = Number.isFinite(Number(monthly_salary)) && Number(monthly_salary) > 0
        ? Number(monthly_salary)
        : parsedDailyRate * 30;

    let positionQuery = supabase
        .from("positions")
        .select("*")
        .eq("position_id", position_id);

    if (!isSuperAdmin(userScope)) {
        positionQuery = positionQuery.eq("company_id", scopedCompanyId);
    }

    const { data: position, error: positionError } = await positionQuery.single();

    if (positionError || !position)
        throw new Error("Position not found.");

    const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("*")
        .eq("role_name", role_name)
        .single();

    if (roleError || !role)
        throw new Error("Role not found.");

    const { data: employee, error: employeeError } = await supabase
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
            phone: normalizeRwandaPhone(phone),
            email,
            address,
            hire_date,
            monthly_salary: resolvedMonthlySalary,
            daily_rate: parsedDailyRate,
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

const getWorkers = async (userScope) => {

    const query = scopeByCompany(supabase
        .from("employees")
        .select(`
            *,
            positions(position_name)
        `)
        .order("created_at", {
            ascending: false
        }), userScope);

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getWorkerById = async (id, userScope) => {

    const query = scopeByCompany(supabase
        .from("employees")
        .select(`
            *,
            positions(position_name)
        `)
        .eq("employee_id", id), userScope);

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const updateWorker = async (id, workerData, userScope) => {

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
        position_id
    } = workerData;

    await getWorkerById(id, userScope);

    const parsedDailyRate = daily_rate === undefined ? undefined : Number(daily_rate);
    if (parsedDailyRate !== undefined && (!Number.isFinite(parsedDailyRate) || parsedDailyRate <= 0)) {
        throw new Error("Daily payment must be greater than zero.");
    }
    const resolvedMonthlySalary = parsedDailyRate !== undefined && (monthly_salary === undefined || monthly_salary === null || monthly_salary === "")
        ? parsedDailyRate * 30
        : monthly_salary;
    let updateData = {
        first_name,
        last_name,
        gender,
        date_of_birth,
        national_id,
        phone: normalizeRwandaPhone(phone),
        email,
        address,
        hire_date,
        monthly_salary: resolvedMonthlySalary,
        daily_rate: parsedDailyRate,
        profile_photo
    };

    if (position_id) {

        let positionQuery = supabase
            .from("positions")
            .select("*")
            .eq("position_id", position_id);

        if (!isSuperAdmin(userScope)) {
            positionQuery = positionQuery.in("company_id", requireCompanyIds(userScope));
        }

        const { data: position, error: positionError } = await positionQuery.single();

        if (positionError || !position)
            throw new Error("Position not found.");

        updateData.position_id = position_id;

    }

    const query = scopeByCompany(supabase
        .from("employees")
        .update(updateData)
        .eq("employee_id", id), userScope);

    const { error } = await query;

    if (error)
        throw error;

    return await getWorkerById(id, userScope);

};

const deactivateWorker = async (id, userScope) => {

    const query = scopeByCompany(supabase
        .from("employees")
        .update({
            status: "INACTIVE"
        })
        .eq("employee_id", id)
        .select(), userScope);

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

module.exports = {
    createWorker,
    getWorkers,
    getWorkerById,
    updateWorker,
    deactivateWorker
};
