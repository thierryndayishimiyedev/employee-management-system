const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");

const assertPositionAccess = async (position_id, user) => {

    if (isSuperAdmin(user)) return;

    const company_id = requireCompanyId(user);
    const { data: position, error } = await supabase
        .from("positions")
        .select("position_id, company_id")
        .eq("position_id", position_id)
        .eq("company_id", company_id)
        .maybeSingle();

    if (error || !position)
        throw new Error("Position not found for your company.");

};

const createPosition = async (positionData, user) => {

    const {
        position_name,
        description,
        daily_salary
    } = positionData;

    const company_id = requireCompanyId(user);

    const { data, error } = await supabase
        .from("positions")
        .insert([{
            company_id,
            position_name,
            description,
            daily_salary
        }])
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const getPositions = async (user) => {

    let query = supabase
        .from("positions")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (!isSuperAdmin(user)) {
        query = query.eq("company_id", requireCompanyId(user));
    }

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getPositionById = async (id, user) => {

    let query = supabase
        .from("positions")
        .select("*")
        .eq("position_id", id);

    if (!isSuperAdmin(user)) {
        query = query.eq("company_id", requireCompanyId(user));
    }

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const updatePosition = async (id, positionData, user) => {

    const {
        position_name,
        description,
        daily_salary
    } = positionData;

    await assertPositionAccess(id, user);

    const { data, error } = await supabase
        .from("positions")
        .update({
            position_name,
            description,
            daily_salary
        })
        .eq("position_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const deletePosition = async (id, user) => {

    await assertPositionAccess(id, user);

    const { error } = await supabase
        .from("positions")
        .delete()
        .eq("position_id", id);

    if (error)
        throw error;

    return true;

};

module.exports = {
    createPosition,
    getPositions,
    getPositionById,
    updatePosition,
    deletePosition
};