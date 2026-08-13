// Live integration test. Creates only AUTOTEST-BIWEEKLY records, then removes
// all created payroll, payment, advance, attendance and employee records.
// Run: node -r dotenv/config scripts/test-biweekly-payroll-workflow.js
const supabase = require("../src/config/supabase");
const { recordAttendance } = require("../src/services/attendance.service");
const { generatePayroll } = require("../src/services/payroll.service");
const { reviewPayroll } = require("../src/services/payrollApproval.service");
const { payAllApprovedPayrolls, getPaymentReport } = require("../src/services/payment.service");
const { getAdvanceBalance } = require("../src/services/advanceDeduction.service");
const { buildReportPdf } = require("../src/services/download.service");

const marker = `AUTOTEST-BIWEEKLY-${Date.now()}`;
const ids = { employee: null, advance: null, attendances: [], payrolls: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function roleUsers(role) {
    const { data, error } = await supabase.from("users")
        .select("user_id,username,employee_id,roles!inner(role_name),employees!inner(company_id)")
        .eq("roles.role_name", role).not("employee_id", "is", null).limit(500);
    if (error || !data?.length) throw new Error(`No usable ${role} user was found.`);
    return data.map((user) => ({ user_id: user.user_id, username: user.username, employee_id: user.employee_id, role_name: role, company_id: user.employees.company_id, company_ids: [user.employees.company_id] }));
}

const iso = (start, offset) => {
    const value = new Date(`${start}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
};

async function main() {
    const [accountants, managers, owners] = await Promise.all([roleUsers("ACCOUNTANT"), roleUsers("MANAGER"), roleUsers("OWNER")]);
    let accountant; let manager; let owner; let position;
    for (const candidate of accountants) {
        const candidateManager = managers.find((item) => item.company_id === candidate.company_id);
        const candidateOwner = owners.find((item) => item.company_id === candidate.company_id);
        if (!candidateManager || !candidateOwner) continue;
        const { data: positions } = await supabase.from("positions").select("position_id").eq("company_id", candidate.company_id).limit(1);
        if (positions?.length) { accountant = candidate; manager = candidateManager; owner = candidateOwner; position = positions[0]; break; }
    }
    assert(accountant && manager && owner && position, "No test company has Accountant, Manager, Owner and position records.");
    const firstStart = "2098-01-01";
    const firstEnd = "2098-01-14";
    const secondStart = "2098-01-15";
    const secondEnd = "2098-01-28";
    const { data: employee, error: employeeError } = await supabase.from("employees").insert([{
        company_id: accountant.company_id, position_id: position.position_id, employee_code: marker,
        first_name: "Auto", last_name: "Biweekly", gender: "MALE", date_of_birth: "1995-01-01",
        national_id: `6${String(Date.now()).slice(-14)}`, phone: "0781234567", address: "Integration test",
        hire_date: firstStart, monthly_salary: 30000, daily_rate: 1000, status: "ACTIVE"
    }]).select().single();
    if (employeeError) throw employeeError;
    ids.employee = employee.employee_id;
    for (let day = 0; day < 28; day += 1) {
        const attendance = await recordAttendance({ employee_id: employee.employee_id, attendance_date: iso(firstStart, day), check_in: "08:00", check_out: "16:00", attendance_status: "PRESENT" }, accountant);
        ids.attendances.push(attendance.attendance_id);
    }
    const { data: advance, error: advanceError } = await supabase.from("salary_advances").insert([{
        employee_id: employee.employee_id, amount: 1000, reason: marker, request_date: firstEnd,
        status: "OWNER_APPROVED", payment_status: "PAID", amount_paid: 1000, amount_deducted: 0,
        remaining_balance: 1000, deduction_status: "NOT_DEDUCTED"
    }]).select().single();
    if (advanceError) throw advanceError;
    ids.advance = advance.advance_id;
    process.env.ADVANCE_DEDUCTION_PER_PAYROLL = "500";

    const first = await generatePayroll({ employee_id: employee.employee_id, payroll_frequency: "BIWEEKLY", payroll_period_start: firstStart, payroll_period_end: firstEnd }, accountant);
    ids.payrolls.push(first.payroll_id);
    assert(first.payroll_frequency === "BIWEEKLY" && first.payroll_period_start === firstStart && first.payroll_period_end === firstEnd, "First payroll period was not persisted.");
    assert(Number(first.days_worked) === 14 && Number(first.basic_salary) === 14000 && Number(first.advance_deduction) === 500 && Number(first.net_salary) === 13500, "First-half attendance, pay or advance deduction is incorrect.");
    const firstDuplicate = await generatePayroll({ employee_id: employee.employee_id, payroll_frequency: "BIWEEKLY", payroll_period_start: firstStart, payroll_period_end: firstEnd }, accountant);
    assert(firstDuplicate.payroll_id === first.payroll_id, "Duplicate generation created/overwrote a first-half payroll.");
    const second = await generatePayroll({ employee_id: employee.employee_id, payroll_frequency: "BIWEEKLY", payroll_period_start: secondStart, payroll_period_end: secondEnd }, accountant);
    ids.payrolls.push(second.payroll_id);
    assert(second.payroll_id !== first.payroll_id && Number(second.days_worked) === 14 && Number(second.advance_deduction) === 500 && Number(second.net_salary) === 13500, "Second-half payroll was not stored/deducted independently.");
    const balance = await getAdvanceBalance(advance);
    assert(balance.remaining === 0, `Expected settled advance balance 0, got ${balance.remaining}`);

    for (const payroll of [first, second]) {
        const managerApproved = await reviewPayroll(payroll.payroll_id, "approve", null, manager);
        assert(managerApproved.approval_status === "MANAGER_APPROVED", "Manager approval failed.");
        const ownerApproved = await reviewPayroll(payroll.payroll_id, "approve", null, owner);
        assert(ownerApproved.approval_status === "OWNER_APPROVED" && ownerApproved.payment_status === "APPROVED", "Owner approval failed.");
        const paid = await payAllApprovedPayrolls({ payroll_id: payroll.payroll_id }, owner);
        assert(paid.paid === 1 && paid.failed === 0 && paid.queue[0].status === "PAID", `Internal payment failed: ${JSON.stringify(paid)}`);
        let duplicatePaymentBlocked = false;
        try { await payAllApprovedPayrolls({ payroll_id: payroll.payroll_id }, owner); }
        catch (error) { duplicatePaymentBlocked = String(error.message).includes("No approved payroll"); }
        assert(duplicatePaymentBlocked, "Duplicate payment was not rejected after the payroll was paid.");
    }
    const { data: deductions, error: deductionsError } = await supabase.from("salary_advance_deductions").select("payroll_id,amount").eq("advance_id", advance.advance_id).order("deducted_at");
    if (deductionsError) throw deductionsError;
    assert(deductions.length === 2 && deductions.map((row) => Number(row.amount)).join(",") === "500,500", "Advance was not deducted exactly once per payroll period.");
    const paymentReport = await getPaymentReport(owner);
    const testPayments = paymentReport.filter((row) => row.transaction_id.startsWith("INT-"));
    assert(testPayments.length >= 2, "Payment report did not include internal payments.");
    const payrollPdf = await buildReportPdf("payroll", owner, { payroll_period_start: firstStart, payroll_period_end: firstEnd });
    assert(payrollPdf.slice(0, 4).toString() === "%PDF", "Payroll PDF was not generated.");
    const pdfText = payrollPdf.toString("latin1");
    assert(pdfText.includes(firstStart) && pdfText.includes(firstEnd), "Payroll PDF does not show the exact selected biweekly period dates.");
    console.log(JSON.stringify({ success: true, periods: [first.payroll_period_start + " to " + first.payroll_period_end, second.payroll_period_start + " to " + second.payroll_period_end], payrolls_separate: first.payroll_id !== second.payroll_id, deductions: deductions.map((row) => Number(row.amount)), approvals: "MANAGER_APPROVED -> OWNER_APPROVED", payment_provider: "INTERNAL_TEST", duplicate_generation_returned_existing: true, duplicate_payment_rejected: true, payroll_pdf_periods_verified: true, payment_report_verified: true }));
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; }).finally(async () => {
    if (ids.payrolls.length) await supabase.from("payments").delete().in("payroll_id", ids.payrolls);
    if (ids.payrolls.length) await supabase.from("salary_advance_deductions").delete().in("payroll_id", ids.payrolls);
    if (ids.advance) await supabase.from("salary_advances").delete().eq("advance_id", ids.advance);
    if (ids.payrolls.length) await supabase.from("payroll").delete().in("payroll_id", ids.payrolls);
    if (ids.attendances.length) await supabase.from("attendance").delete().in("attendance_id", ids.attendances);
    if (ids.employee) await supabase.from("employees").delete().eq("employee_id", ids.employee);
});
