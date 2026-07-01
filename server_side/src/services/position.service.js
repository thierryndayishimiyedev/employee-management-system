const supabase = require("../config/supabase");

const createPosition = async (positionData) => {

    const {
        department_id,
        position_name,
        description
    } = positionData;

    const { data, error } = await supabase
        .from("positions")
        .insert([{
            department_id,
            position_name,
            description
        }])
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const getPositions = async () => {

    const { data, error } = await supabase
        .from("positions")
        .select(`
            *,
            departments(
                department_name
            )
        `)
        .order("created_at", {
            ascending: false
        });

    if (error)
        throw error;

    return data;

};

const getPositionById = async (id) => {

    const { data, error } = await supabase
        .from("positions")
        .select(`
            *,
            departments(
                department_name
            )
        `)
        .eq("position_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const updatePosition = async (id, positionData) => {

    const {
        position_name,
        description
    } = positionData;

    const { data, error } = await supabase
        .from("positions")
        .update({
            position_name,
            description
        })
        .eq("position_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const deletePosition = async (id) => {

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