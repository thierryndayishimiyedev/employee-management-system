const supabase = require("../config/supabase");
const { requireCompanyId, scopeByCompany } = require("../utils/companyScope");

const createDepartment = async (departmentData, user) => {

    const {
        department_name,
        description
    } = departmentData;
    const company_id = requireCompanyId(user) || departmentData.company_id;

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

const getDepartments = async (user) => {

    const query = scopeByCompany(supabase
        .from("departments")
        .select(`
            *,
            companies(
                company_name
            )
        `)
        .order("created_at", {
            ascending: false
        }), user);

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getDepartmentById = async (id, user) => {

    const query = scopeByCompany(supabase
        .from("departments")
        .select(`
            *,
            companies(
                company_name
            )
        `)
        .eq("department_id", id), user);

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const updateDepartment = async (id, departmentData, user) => {

    const {
        department_name,
        description
    } = departmentData;

    const query = scopeByCompany(supabase
        .from("departments")
        .update({
            department_name,
            description
        })
        .eq("department_id", id)
        .select(), user);

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const deleteDepartment = async (id, user) => {

    const query = scopeByCompany(supabase
        .from("departments")
        .delete()
        .eq("department_id", id), user);

    const { error } = await query;

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
