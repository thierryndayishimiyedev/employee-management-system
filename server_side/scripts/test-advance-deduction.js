// Live integration test.  Creates only `AUTOTEST-ADVANCE-*` records and removes
// them in finally. Run from server_side: node scripts/test-advance-deduction.js
require("dotenv").config();
const supabase = require("../src/config/supabase");
const { applyPayrollAdvanceDeductions, getAdvanceBalance } = require("../src/services/advanceDeduction.service");

const marker = `AUTOTEST-ADVANCE-${Date.now()}`;
const ids = { payrolls: [], advance: null, employee: null };
const fail = (message) => { throw new Error(message); };

async function createPayroll(employee_id, index) {
    const { data, error } = await supabase.from("payroll").insert([{
        employee_id, payroll_month: index, payroll_year: 2099, days_worked: 1, overtime_hours: 0,
        basic_salary: 100000, overtime_pay: 0, allowances: 0, deductions: 0,
        advance_deduction: 0, net_salary: 100000, payment_status: "GENERATED", approval_status: "GENERATED"
    }]).select().single();
    if (error) throw error;
    ids.payrolls.push(data.payroll_id);
    return data;
}

async function main() {
    const { data: template, error: templateError } = await supabase.from("employees").select("company_id,position_id").limit(1).single();
    if (templateError) throw templateError;
    const { data: employee, error: employeeError } = await supabase.from("employees").insert([{
        company_id: template.company_id, position_id: template.position_id, employee_code: marker,
        first_name: "Auto", last_name: "Deduction", gender: "MALE", date_of_birth: "1995-01-01",
        national_id: `9${String(Date.now()).slice(-14)}`, phone: "0781234567", address: "Integration test",
        hire_date: "2099-01-01", monthly_salary: 100000, daily_rate: 3333, status: "ACTIVE"
    }]).select().single();
    if (employeeError) throw employeeError;
    ids.employee = employee.employee_id;
    const { data: advance, error: advanceError } = await supabase.from("salary_advances").insert([{
        employee_id: employee.employee_id, amount: 100000, reason: marker, request_date: "2099-01-01",
        status: "OWNER_APPROVED", payment_status: "PAID", amount_paid: 100000, amount_deducted: 0,
        remaining_balance: 100000, deduction_status: "NOT_DEDUCTED"
    }]).select().single();
    if (advanceError) throw advanceError;
    ids.advance = advance.advance_id;

    const expected = [[25_000, 75_000], [25_000, 50_000], [50_000, 0]];
    for (let i = 0; i < expected.length; i += 1) {
        process.env.ADVANCE_DEDUCTION_PER_PAYROLL = String(expected[i][0]);
        const payroll = await createPayroll(employee.employee_id, i + 1);
        const deducted = await applyPayrollAdvanceDeductions({ payrollId: payroll.payroll_id, employeeId: employee.employee_id });
        const balance = await getAdvanceBalance(advance);
        if (deducted !== expected[i][0] || balance.remaining !== expected[i][1]) fail(`Step ${i + 1} expected ${expected[i]}, got ${deducted},${balance.remaining}`);
    }
    const { data: ledger, error: ledgerError } = await supabase.from("salary_advance_deductions").select("amount").eq("advance_id", advance.advance_id).order("deducted_at");
    if (ledgerError) throw ledgerError;
    if (ledger.length !== 3 || ledger.map(x => Number(x.amount)).join(",") !== "25000,25000,50000") fail(`Unexpected ledger ${JSON.stringify(ledger)}`);
    const duplicate = await supabase.from("salary_advance_deductions").insert([{ advance_id: advance.advance_id, payroll_id: ids.payrolls[2], amount: 1 }]);
    if (!duplicate.error || duplicate.error.code !== "23505") fail("Duplicate advance/payroll deduction was not rejected.");
    console.log(JSON.stringify({ success: true, marker, deductions: ledger.map(x => Number(x.amount)), remaining: 0, duplicate_rejected: true }));
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; }).finally(async () => {
    if (ids.payrolls.length) await supabase.from("salary_advance_deductions").delete().in("payroll_id", ids.payrolls);
    if (ids.advance) await supabase.from("salary_advances").delete().eq("advance_id", ids.advance);
    if (ids.payrolls.length) await supabase.from("payroll").delete().in("payroll_id", ids.payrolls);
    if (ids.employee) await supabase.from("employees").delete().eq("employee_id", ids.employee);
});
