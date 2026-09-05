

const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds, resolveAuthorizedCompanyId, scopeByCompany } = require("../utils/companyScope");
const { normalizeMtnRwandaPhone } = require("../utils/rwandaPhone");
const { scopeByManager, resolveManagerForWrite, assertManagerInCompany } = require("../utils/managerScope");

const codePart = (value, fallback) => String(value || fallback).replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase().padEnd(3, "X");
const asBoolean = (value) => value === true || String(value).toUpperCase() === "YES" || String(value).toLowerCase() === "true";

const generateWorkerCode = async ({ managerUserId, positionName }) => {
    const { data: manager, error: managerError } = await supabase
        .from("users")
        .select("employees!fk_user_employee!inner(first_name)")
        .eq("user_id", managerUserId)
        .single();
    if (managerError || !manager) throw new Error("Manager not found for worker-code generation.");
    const prefix = `${codePart(manager.employees?.first_name, "MGR")}-${codePart(positionName, "WRK")}-`;
    const { data: existing, error } = await supabase
        .from("employees")
        .select("employee_code")
        .like("employee_code", `${prefix}%`);
    if (error) throw error;
    const next = (existing || []).reduce((highest, row) => Math.max(highest, Number(String(row.employee_code || "").split("-").at(-1)) || 0), 0) + 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
};

const createWorker = async (data, userScope) => {

    const {
        company_id,
        position_id,
        first_name,
        last_name,
        gender,
        national_id,
        phone,
        address,
        hire_date,
        monthly_salary,
        daily_rate,
        payment_type,
        ejo_heza,
        mutuelle_de_sante
    } = data;
    const scopedCompanyId = resolveAuthorizedCompanyId(userScope, company_id);
    const manager_user_id = resolveManagerForWrite(userScope, data.manager_user_id);
    if (!manager_user_id) throw new Error("A manager must be selected for every worker.");
    await assertManagerInCompany(manager_user_id, scopedCompanyId);
    const isFlexible = payment_type === "FLEXIBLE_DAILY";
    const parsedDailyRate = isFlexible ? 0 : Number(daily_rate);
    if (!isFlexible && (!Number.isFinite(parsedDailyRate) || parsedDailyRate <= 0)) {
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
    const employee_code = await generateWorkerCode({ managerUserId: manager_user_id, positionName: position.position_name });

    const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .insert([{
            company_id: scopedCompanyId,
            manager_user_id,
            position_id,
            employee_code,
            first_name,
            last_name,
            gender,
            national_id,
            phone: normalizeMtnRwandaPhone(phone),
            address,
            hire_date,
            monthly_salary: resolvedMonthlySalary,
            daily_rate: parsedDailyRate,
            payment_type: isFlexible ? "FLEXIBLE_DAILY" : "FIXED_DAILY",
            is_worker: true,
            ejo_heza: asBoolean(ejo_heza),
            mutuelle_de_sante: asBoolean(mutuelle_de_sante)
        }])
        .select()
        .single();

    if (employeeError)
        throw employeeError;

    return { employee };

};

const getWorkers = async (userScope) => {

    let query = scopeByCompany(supabase
        .from("employees")
        .select(`
            *,
            positions(position_name)
        `)
        .eq("is_worker", true)
        .order("created_at", {
            ascending: false
        }), userScope);
    query = scopeByManager(query, userScope);

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getWorkerById = async (id, userScope) => {

    let query = scopeByCompany(supabase
        .from("employees")
        .select(`
            *,
            positions(position_name)
        `)
        .eq("is_worker", true)
        .eq("employee_id", id), userScope);
    query = scopeByManager(query, userScope);

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
        national_id,
        phone,
        address,
        hire_date,
        monthly_salary,
        daily_rate,
        payment_type,
        position_id,
        ejo_heza,
        mutuelle_de_sante
    } = workerData;

    await getWorkerById(id, userScope);

    const isFlexible = payment_type === "FLEXIBLE_DAILY";
    const parsedDailyRate = daily_rate === undefined ? undefined : (isFlexible ? 0 : Number(daily_rate));
    if (!isFlexible && parsedDailyRate !== undefined && (!Number.isFinite(parsedDailyRate) || parsedDailyRate <= 0)) {
        throw new Error("Daily payment must be greater than zero.");
    }
    const resolvedMonthlySalary = parsedDailyRate !== undefined && (monthly_salary === undefined || monthly_salary === null || monthly_salary === "")
        ? parsedDailyRate * 30
        : monthly_salary;
    let updateData = {
        first_name,
        last_name,
        gender,
        national_id,
        phone: phone === undefined ? undefined : normalizeMtnRwandaPhone(phone),
        address,
        hire_date,
        monthly_salary: resolvedMonthlySalary,
        daily_rate: parsedDailyRate,
        ...(payment_type ? { payment_type: isFlexible ? "FLEXIBLE_DAILY" : "FIXED_DAILY" } : {}),
        ejo_heza: ejo_heza === undefined ? undefined : asBoolean(ejo_heza),
        mutuelle_de_sante: mutuelle_de_sante === undefined ? undefined : asBoolean(mutuelle_de_sante)
    };
    if (workerData.manager_user_id !== undefined) {
        const manager_user_id = resolveManagerForWrite(userScope, workerData.manager_user_id);
        if (!manager_user_id) throw new Error("A manager must be selected for every worker.");
        const current = await getWorkerById(id, userScope);
        await assertManagerInCompany(manager_user_id, current.company_id);
        updateData.manager_user_id = manager_user_id;
    }

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

    let query = scopeByCompany(supabase
        .from("employees")
        .update(updateData)
        .eq("employee_id", id), userScope);
    query = scopeByManager(query, userScope);

    const { error } = await query;

    if (error)
        throw error;

    return await getWorkerById(id, userScope);

};

const deactivateWorker = async (id, userScope) => {

    let query = scopeByCompany(supabase
        .from("employees")
        .update({
            status: "INACTIVE"
        })
        .eq("employee_id", id)
        .select(), userScope);
    query = scopeByManager(query, userScope);

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
