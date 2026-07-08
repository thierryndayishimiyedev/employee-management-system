const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");

const createReport = async (reportData, user) => {

    const {
        report_date,
        title,
        report_content
    } = reportData;
    const scopedCompanyId = requireCompanyId(user) || company_id;

    const { data, error } = await supabase
        .from("reports")
        .insert([{
            company_id: scopedCompanyId,
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

const scopedReportQuery = (user) => {
    let query = supabase
        .from("reports")
        .select(`
            *,
            employees(
                first_name,
                last_name
            )
        `);

    if (!isSuperAdmin(user)) {
        query = query.eq("company_id", requireCompanyId(user));
    }

    if (user?.role_name === "ACCOUNTANT") {
        query = query.eq("accountant_id", user.employee_id);
    }

    return query;
};

const getReports = async (user) => {

    const { data, error } = await scopedReportQuery(user)
        .order("created_at", {
            ascending: false
        });

    if (error)
        throw error;

    return data;

};

const getReportById = async (id, user) => {

    const { data, error } = await scopedReportQuery(user)
        .eq("report_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const markReportAsRead = async (id, user) => {

    await getReportById(id, user);

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

const submitReport = async (id, user) => {

    const report = await getReportById(id, user);

    if (user?.role_name === "ACCOUNTANT" && report.accountant_id !== user.employee_id)
        throw new Error("Forbidden: report belongs to another accountant.");

    const { data, error } = await supabase
        .from("reports")
        .update({
            is_submitted: true,
            is_read: true
        })
        .eq("report_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const approveReportEdit = async (id, user) => {

    await getReportById(id, user);

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

const updateReport = async (id, reportData, user) => {

    const {
        title,
        report_content
    } = reportData;

    const existing = await getReportById(id, user);

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
