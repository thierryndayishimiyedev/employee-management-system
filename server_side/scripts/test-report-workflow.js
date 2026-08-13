// Live integration test. Creates one AUTOTEST report and removes it in finally.
// Run from server_side: node -r dotenv/config scripts/test-report-workflow.js
const supabase = require("../src/config/supabase");
const { createReport, submitReport, reviewReport, updateReport } = require("../src/services/report.service");

const marker = `AUTOTEST-REPORT-${Date.now()}`;
const reportIds = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function getRoleUser(role) {
    const { data, error } = await supabase.from("users")
        .select("user_id, username, employee_id, roles!inner(role_name), employees(company_id)")
        .eq("roles.role_name", role)
        .not("employee_id", "is", null)
        .limit(1)
        .single();
    if (error || !data?.employees?.company_id) throw new Error(`No ${role} user with an employee/company was found for the test.`);
    return {
        user_id: data.user_id,
        employee_id: data.employee_id,
        username: data.username,
        role_name: role,
        company_id: data.employees.company_id,
        company_ids: [data.employees.company_id]
    };
}

async function main() {
    const accountant = await getRoleUser("ACCOUNTANT");
    const manager = await getRoleUser("MANAGER");
    const owner = await getRoleUser("OWNER");
    assert(manager.company_id === accountant.company_id, "Demo manager is not in the accountant company.");
    assert(owner.company_id === accountant.company_id, "Demo owner is not in the accountant company.");
    const today = new Date().toISOString().slice(0, 10);
    const report = await createReport({ report_date: today, title: marker, report_content: "Disposable live workflow test" }, accountant);
    const reportId = report.report_id;
    reportIds.push(reportId);
    const submitted = await submitReport(reportId, accountant);
    assert(submitted.status === "PENDING_MANAGER", `Expected PENDING_MANAGER, got ${submitted.status}`);
    const managerApproved = await reviewReport(reportId, "approve", "AUTOTEST manager approval", manager);
    assert(managerApproved.status === "PENDING_OWNER", `Expected PENDING_OWNER, got ${managerApproved.status}`);
    const ownerApproved = await reviewReport(reportId, "approve", "AUTOTEST owner approval", owner);
    assert(ownerApproved.status === "APPROVED" && ownerApproved.is_locked, "Owner approval did not lock the report.");
    let editBlocked = false;
    try { await updateReport(reportId, { title: marker, report_content: "Should fail" }, accountant); }
    catch (error) { editBlocked = String(error.message).includes("Owner approval required"); }
    assert(editBlocked, "Accountant edit of an owner-approved locked report was not blocked.");

    const correctionReport = await createReport({ report_date: today, title: `${marker}-CORRECTION`, report_content: "Initial content" }, accountant);
    reportIds.push(correctionReport.report_id);
    await submitReport(correctionReport.report_id, accountant);
    await reviewReport(correctionReport.report_id, "approve", "AUTOTEST manager approval", manager);
    const changesRequested = await reviewReport(correctionReport.report_id, "reject", "Please correct the notes", owner);
    assert(changesRequested.status === "CHANGES_REQUESTED" && !changesRequested.is_locked, "Owner change request did not reopen the report.");
    const corrected = await updateReport(correctionReport.report_id, { title: `${marker}-CORRECTED`, report_content: "Corrected content" }, accountant);
    assert(corrected.status === "DRAFT", "Corrected report did not return to DRAFT.");
    await submitReport(correctionReport.report_id, accountant);
    await reviewReport(correctionReport.report_id, "approve", "AUTOTEST manager reapproval", manager);
    const relocked = await reviewReport(correctionReport.report_id, "approve", "AUTOTEST owner final approval", owner);
    assert(relocked.status === "APPROVED" && relocked.is_locked, "Corrected report was not finally locked.");
    console.log(JSON.stringify({ success: true, statuses: [submitted.status, managerApproved.status, ownerApproved.status], locked: ownerApproved.is_locked, accountant_edit_blocked: true, correction_loop: [changesRequested.status, corrected.status, relocked.status] }));
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; }).finally(async () => {
    if (reportIds.length) await supabase.from("reports").delete().in("report_id", reportIds);
});
