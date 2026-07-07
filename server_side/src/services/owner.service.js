const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");

const ensureOwnerRole = async () => {
    const { data: existingRoles, error: findError } = await supabase
        .from("roles")
        .select("*")
        .eq("role_name", "OWNER")
        .limit(1);

    if (findError)
        throw findError;

    if (existingRoles && existingRoles.length > 0)
        return existingRoles[0];

    const { data, error } = await supabase
        .from("roles")
        .insert([{
            role_name: "OWNER",
            description: "Company Owner"
        }])
        .select()
        .single();

    if (error)
        throw error;

    return data;
};

const ensureOwnerDepartment = async (company_id, preferredName = "Administration") => {
    const { data: departments, error: findError } = await supabase
        .from("departments")
        .select("*")
        .eq("company_id", company_id)
        .order("created_at", { ascending: true });

    if (findError)
        throw findError;

    const exactDepartment = departments?.find((department) =>
        department.department_name === preferredName
    );

    if (exactDepartment)
        return exactDepartment;

    if (preferredName === "Administration") {
        const adminDepartment = departments?.find((department) =>
            ["Admin", "Demo Administration"].includes(department.department_name)
        ) || departments?.[0];

        if (adminDepartment)
            return adminDepartment;
    }

    const departmentNames = [
        preferredName || "Administration",
        `${preferredName || "Administration"} ${String(company_id).slice(0, 8)}`
    ];

    for (const department_name of departmentNames) {
        const { data, error } = await supabase
            .from("departments")
            .insert([{
                company_id,
                department_name,
                description: "Administration department"
            }])
            .select()
            .single();

        if (!error)
            return data;
    }

    throw new Error("Unable to prepare owner department.");
};

const getPositionById = async (position_id) => {
    const { data, error } = await supabase
        .from("positions")
        .select("*")
        .eq("position_id", position_id)
        .single();

    if (error || !data)
        throw new Error("Selected owner position was not found.");

    return data;
};

const ensurePositionForDepartment = async (department_id, positionName = "Owner") => {
    const { data: existingPositions, error: findError } = await supabase
        .from("positions")
        .select("*")
        .eq("department_id", department_id)
        .eq("position_name", positionName)
        .limit(1);

    if (findError)
        throw findError;

    if (existingPositions && existingPositions.length > 0)
        return existingPositions[0];

    const { data, error } = await supabase
        .from("positions")
        .insert([{
            department_id,
            position_name: positionName,
            description: "Company Owner"
        }])
        .select()
        .single();

    if (error)
        throw error;

    return data;
};

const ensureOwnerPosition = async ({
    company_id,
    department_id,
    position_id,
    department_name,
    position_name
}) => {
    if (position_id)
        return await getPositionById(position_id);

    const requestedPosition = position_name || "Owner";

    if (department_id)
        return await ensurePositionForDepartment(department_id, requestedPosition);

    const { data: departments, error: departmentError } = await supabase
        .from("departments")
        .select("department_id")
        .eq("company_id", company_id);

    if (departmentError)
        throw departmentError;

    const departmentIds = (departments || []).map((department) => department.department_id);

    if (departmentIds.length > 0) {
        const { data: positions, error: positionError } = await supabase
            .from("positions")
            .select("*")
            .in("department_id", departmentIds)
            .eq("position_name", requestedPosition)
            .limit(1);

        if (positionError)
            throw positionError;

        if (positions && positions.length > 0)
            return positions[0];
    }

    const department = await ensureOwnerDepartment(company_id, department_name || "Administration");

    return await ensurePositionForDepartment(department.department_id, requestedPosition);
};

const createOwner = async (ownerData) => {

    const {
        company_id,
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
        profile_photo,
        department_id,
        position_id,
        department_name,
        position_name,
        username,
        password
    } = ownerData;

    const position = await ensureOwnerPosition({
        company_id,
        department_id,
        position_id,
        department_name,
        position_name
    });
    const role = await ensureOwnerRole();

    // Generate Employee Code

    const employee_code = `OWN${Date.now().toString().slice(-5)}`;

    // Calculate Daily Rate

    const daily_rate = Math.round(Number(monthly_salary) / 30);

    // Create Employee

    const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .insert([
            {
                company_id,
                department_id: position.department_id,
                position_id: position.position_id,
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
        profile_photo,
        username
    } = ownerData;

    const { data: user, error } = await supabase
        .from("users")
        .select("employee_id")
        .eq("user_id", id)
        .single();

    if (error || !user)
        throw new Error("Owner not found.");

    const daily_rate = monthly_salary
        ? Math.round(Number(monthly_salary) / 30)
        : undefined;

    const updateData = {
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
        profile_photo
    };

    if (daily_rate !== undefined) {
        updateData.daily_rate = daily_rate;
    }

    const { error: employeeError } = await supabase
        .from("employees")
        .update(updateData)
        .eq("employee_id", user.employee_id);

    if (employeeError)
        throw employeeError;

    if (username) {

        const { error: usernameError } = await supabase
            .from("users")
            .update({ username })
            .eq("user_id", id);

        if (usernameError)
            throw usernameError;

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
