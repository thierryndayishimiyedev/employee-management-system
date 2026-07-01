const supabase = require("../config/supabase");

const createDepartment = async (departmentData) => {

    const {
        company_id,
        department_name,
        description
    } = departmentData;

    const { data, error } = await supabase
        .from("departments")
        .insert([{
            company_id,
            department_name,
            description
        }])
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const getDepartments = async () => {

    const { data, error } = await supabase
        .from("departments")
        .select(`
            *,
            companies(
                company_name
            )
        `)
        .order("created_at", {
            ascending: false
        });

    if (error)
        throw error;

    return data;

};

const getDepartmentById = async (id) => {

    const { data, error } = await supabase
        .from("departments")
        .select(`
            *,
            companies(
                company_name
            )
        `)
        .eq("department_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const updateDepartment = async (id, departmentData) => {

    const {
        department_name,
        description
    } = departmentData;

    const { data, error } = await supabase
        .from("departments")
        .update({
            department_name,
            description
        })
        .eq("department_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const deleteDepartment = async (id) => {

    const { error } = await supabase
        .from("departments")
        .delete()
        .eq("department_id", id);

    if (error)
        throw error;

    return true;

};

module.exports = {
    createDepartment,
    getDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
};