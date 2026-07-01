const supabase = require("../config/supabase");

const createWorker = async (data) => {

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
        profile_photo
    } = data;

    const { data: position, error: positionError } = await supabase
        .from("positions")
        .select("*")
        .eq("position_id", position_id)
        .single();

    if (positionError || !position)
        throw new Error("Position not found.");

    const { data: employee, error } = await supabase
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

    if (error)
        throw error;

    return employee;

};

const getWorkers = async () => {

    const { data, error } = await supabase
        .from("employees")
        .select(`
            *,
            positions(position_name),
            departments(department_name)
        `)
        .order("created_at", { ascending: false });

    if (error)
        throw error;

    return data;

};

const getWorkerById = async (id) => {

    const { data, error } = await supabase
        .from("employees")
        .select(`
            *,
            positions(position_name),
            departments(department_name)
        `)
        .eq("employee_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const updateWorker = async (id, workerData) => {

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

        const { data: position } = await supabase
            .from("positions")
            .select("department_id")
            .eq("position_id", position_id)
            .single();

        updateData.position_id = position_id;
        updateData.department_id = position.department_id;

    }

    const { error } = await supabase
        .from("employees")
        .update(updateData)
        .eq("employee_id", id);

    if (error)
        throw error;

    return await getWorkerById(id);

};

const deactivateWorker = async (id) => {

    const { data, error } = await supabase
        .from("employees")
        .update({
            status: "INACTIVE"
        })
        .eq("employee_id", id)
        .select()
        .single();

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