const supabase = require("../config/supabase");

const getEmployeesForAttendance = async () => {
    const { data, error } = await supabase
        .from("employees")
        .select("employee_id, employee_code, first_name, last_name")
        .order("first_name", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};

module.exports = {
    getEmployeesForAttendance
};
