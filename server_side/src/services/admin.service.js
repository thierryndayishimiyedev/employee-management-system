const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");

const createAdmin = async (adminData) => {

    const {
        username,
        password,
        full_name,
        phone,
        email
    } = adminData;

    const { data: existingAdmin } = await supabase
        .from("admins")
        .select("admin_id")
        .eq("username", username)
        .maybeSingle();

    if (existingAdmin)
        throw new Error("Username already exists.");

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
        .from("admins")
        .insert([{
            username,
            password: hashedPassword,
            full_name,
            phone,
            email
        }])
        .select()
        .single();

    if (error)
        throw error;

    delete data.password;

    return data;

};

const getAdmins = async () => {

    const { data, error } = await supabase
        .from("admins")
        .select("admin_id, username, full_name, phone, email, created_at")
        .order("created_at", {
            ascending: false
        });

    if (error)
        throw error;

    return data;

};

const getAdminById = async (id) => {

    const { data, error } = await supabase
        .from("admins")
        .select("admin_id, username, full_name, phone, email, created_at")
        .eq("admin_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const updateAdmin = async (id, adminData) => {

    const {
        username,
        full_name,
        phone,
        email
    } = adminData;

    const { data, error } = await supabase
        .from("admins")
        .update({
            username,
            full_name,
            phone,
            email
        })
        .eq("admin_id", id)
        .select()
        .single();

    if (error)
        throw error;

    delete data.password;

    return data;

};

const deleteAdmin = async (id) => {

    const { error } = await supabase
        .from("admins")
        .delete()
        .eq("admin_id", id);

    if (error)
        throw error;

    return true;

};

module.exports = {
    createAdmin,
    getAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin
};