const supabase = require("../config/supabase");

const createReport = async (reportData, user) => {

    const {
        company_id,
        report_date,
        title,
        report_content
    } = reportData;

    const { data, error } = await supabase
        .from("reports")
        .insert([{
            company_id,
            accountant_id: user.employee_id,
            report_date,
            title,
            report_content
        }])
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const getReports = async () => {

    const { data, error } = await supabase
        .from("reports")
        .select(`
            *,
            employees(
                first_name,
                last_name
            )
        `)
        .order("created_at", {
            ascending: false
        });

    if (error)
        throw error;

    return data;

};

const getReportById = async (id) => {

    const { data, error } = await supabase
        .from("reports")
        .select(`
            *,
            employees(
                first_name,
                last_name
            )
        `)
        .eq("report_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const markReportAsRead = async (id) => {

    const { data, error } = await supabase
        .from("reports")
        .update({
            is_read: true
        })
        .eq("report_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const submitReport = async (id) => {

    const { data: report } = await supabase
        .from("reports")
        .select("*")
        .eq("report_id", id)
        .single();

    if (!report.is_read) {

        throw new Error(
            "Read the report before submitting."
        );

    }

    const { data, error } = await supabase
        .from("reports")
        .update({
            is_submitted: true
        })
        .eq("report_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const approveReportEdit = async (id) => {

    const { data, error } = await supabase
        .from("reports")
        .update({
            owner_edit_approved: true
        })
        .eq("report_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const updateReport = async (id, reportData) => {

    const {
        title,
        report_content
    } = reportData;

    const { data: existing } = await supabase
        .from("reports")
        .select("*")
        .eq("report_id", id)
        .single();

    if (
        existing.is_submitted &&
        !existing.owner_edit_approved
    ) {

        throw new Error(
            "Owner approval required to edit submitted report."
        );

    }

    const { data, error } = await supabase
        .from("reports")
        .update({
            title,
            report_content,
            owner_edit_approved: false
        })
        .eq("report_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

module.exports = {
    createReport,
    getReports,
    getReportById,
    markReportAsRead,
    submitReport,
    approveReportEdit,
    updateReport
};