const supabase = require("../config/supabase");

const getRoles = async () => {

    const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("role_name", {
            ascending: true
        });

    if (error)
        throw error;

    return data;

};

const getRoleById = async (id) => {

    const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("role_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

module.exports = {
    getRoles,
    getRoleById
};