// Live integration test. Creates only AUTOTEST-PAYROLL records and deletes them
// in finally. Run from server_side: node -r dotenv/config scripts/test-payroll-workflow.js
const supabase = require("../src/config/supabase");
const { recordAttendance } = require("../src/services/attendance.service");
const { generatePayroll } = require("../src/services/payroll.service");
const { reviewPayroll } = require("../src/services/payrollApproval.service");
const { payAllApprovedPayrolls } = require("../src/services/payment.service");

const marker = `AUTOTEST-PAYROLL-${Date.now()}`;
const ids = { employee: null, attendance: null, payroll: null, payments: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function getRoleUsers(role) {
    const { data, error } = await supabase.from("users")
        .select("user_id,username,employee_id,roles!inner(role_name),employees!inner(company_id)")
        .eq("roles.role_name", role).not("employee_id", "is", null).limit(500);
    if (error || !data?.length) throw new Error(`No usable ${role} account was found.`);
    return data.map((user) => ({ user_id: user.user_id, username: user.username, employee_id: user.employee_id, role_name: role, company_id: user.employees.company_id, company_ids: [user.employees.company_id] }));
}

async function main() {
    const accountants = await getRoleUsers("ACCOUNTANT");
    const managers = await getRoleUsers("MANAGER");
    const owners = await getRoleUsers("OWNER");
    let accountant;
    let manager;
    let owner;
    let position;
    for (const candidate of accountants) {
        const candidateManager = managers.find((item) => item.company_id === candidate.company_id);
        const candidateOwner = owners.find((item) => item.company_id === candidate.company_id);
        if (!candidateManager || !candidateOwner) continue;
        const { data: positions, error } = await supabase.from("positions").select("position_id").eq("company_id", candidate.company_id).limit(1);
        if (!error && positions?.length) {
            accountant = candidate;
            manager = candidateManager;
            owner = candidateOwner;
            position = positions[0];
            break;
        }
    }
    assert(accountant && manager && owner && position, "No company has Accountant, Manager, Owner and a position for the disposable test.");
    const today = new Date().toISOString().slice(0, 10);
    const { data: employee, error: employeeError } = await supabase.from("employees").insert([{
        company_id: accountant.company_id, position_id: position.position_id, employee_code: marker,
        first_name: "Auto", last_name: "Payroll", gender: "MALE", date_of_birth: "1995-01-01",
        national_id: `7${String(Date.now()).slice(-14)}`, phone: "0781234567", address: "Integration test",
        hire_date: today, monthly_salary: 30000, daily_rate: 1000, status: "ACTIVE"
    }]).select().single();
    if (employeeError) throw employeeError;
    ids.employee = employee.employee_id;
    const attendance = await recordAttendance({ employee_id: employee.employee_id, attendance_date: today, check_in: "08:00", check_out: "16:00", attendance_status: "PRESENT" }, accountant);
    ids.attendance = attendance.attendance_id;
    const payroll = await generatePayroll({ employee_id: employee.employee_id, payroll_month: new Date().getMonth() + 1, payroll_year: new Date().getFullYear(), payroll_frequency: "MONTHLY" }, accountant);
    ids.payroll = payroll.payroll_id;
    assert(Number(payroll.days_worked) === 1 && Number(payroll.basic_salary) === 1000, "Payroll did not derive daily payment from attendance.");
    let unapprovedBlocked = false;
    try { await payAllApprovedPayrolls({ payroll_id: payroll.payroll_id }, owner); }
    catch (error) { unapprovedBlocked = String(error.message).includes("No approved payroll"); }
    assert(unapprovedBlocked, "Unapproved payroll payment was not blocked.");
    const managerApproved = await reviewPayroll(payroll.payroll_id, "approve", null, manager);
    assert(managerApproved.approval_status === "MANAGER_APPROVED", "Manager approval failed.");
    const ownerApproved = await reviewPayroll(payroll.payroll_id, "approve", null, owner);
    assert(ownerApproved.approval_status === "OWNER_APPROVED" && ownerApproved.payment_status === "APPROVED", "Owner approval failed.");
    const payment = await payAllApprovedPayrolls({ payroll_id: payroll.payroll_id }, owner);
    assert(payment.paid === 1 && payment.failed === 0, `Internal payment result was unexpected: ${JSON.stringify(payment)}`);
    const { data: payments, error: paymentsError } = await supabase.from("payments").select("payment_id,payment_status,payment_method,transaction_id").eq("payroll_id", payroll.payroll_id);
    if (paymentsError) throw paymentsError;
    ids.payments = (payments || []).map((item) => item.payment_id);
    assert(payments.length === 1 && payments[0].payment_status === "PAID", "Payment record was not marked PAID.");
    console.log(JSON.stringify({ success: true, payroll: { days_worked: payroll.days_worked, basic_salary: payroll.basic_salary }, approvals: [managerApproved.approval_status, ownerApproved.approval_status], unapproved_payment_blocked: true, internal_payment: { status: payments[0].payment_status, method: payments[0].payment_method, transaction_id: payments[0].transaction_id } }));
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; }).finally(async () => {
    if (ids.payroll) await supabase.from("payments").delete().eq("payroll_id", ids.payroll);
    if (ids.payroll) await supabase.from("salary_advance_deductions").delete().eq("payroll_id", ids.payroll);
    if (ids.payroll) await supabase.from("payroll").delete().eq("payroll_id", ids.payroll);
    if (ids.attendance) await supabase.from("attendance").delete().eq("attendance_id", ids.attendance);
    if (ids.employee) await supabase.from("employees").delete().eq("employee_id", ids.employee);
});
