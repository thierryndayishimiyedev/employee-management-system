

const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId, scopeByCompany } = require("../utils/companyScope");

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
    const scopedCompanyId = requireCompanyId(userScope) || company_id;

    let positionQuery = supabase
        .from("positions")
        .select("*, departments!inner(company_id)")
        .eq("position_id", position_id);

    if (!isSuperAdmin(userScope)) {
        positionQuery = positionQuery.eq("departments.company_id", scopedCompanyId);
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
            positions(position_name),
            departments(department_name)
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
            positions(position_name),
            departments(department_name)
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

    let updateData = {
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
    };

    if (position_id) {

        let positionQuery = supabase
            .from("positions")
            .select("department_id, departments!inner(company_id)")
            .eq("position_id", position_id);

        if (!isSuperAdmin(userScope)) {
            positionQuery = positionQuery.eq("departments.company_id", requireCompanyId(userScope));
        }

        const { data: position, error: positionError } = await positionQuery.single();

        if (positionError || !position)
            throw new Error("Position not found.");

        updateData.position_id = position_id;
        updateData.department_id = position.department_id;

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
