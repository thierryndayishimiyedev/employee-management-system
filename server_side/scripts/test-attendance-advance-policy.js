// Live integration test. Creates only AUTOTEST-ATTENDANCE-ADVANCE records and
// removes them in finally. Run from server_side:
// node -r dotenv/config scripts/test-attendance-advance-policy.js
const supabase = require("../src/config/supabase");
const { recordAttendance } = require("../src/services/attendance.service");
const { requestAdvance, getAdvanceEligibility } = require("../src/services/advance.service");

const marker = `AUTOTEST-ATTENDANCE-ADVANCE-${Date.now()}`;
const ids = { employee: null, attendances: [], advances: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const dateOffset = (days) => {
    const value = new Date();
    value.setDate(value.getDate() + days);
    return value.toISOString().slice(0, 10);
};

async function main() {
    const { data: template, error: templateError } = await supabase
        .from("employees").select("company_id,position_id").not("position_id", "is", null).limit(1).single();
    if (templateError) throw templateError;
    const { data: admin, error: adminError } = await supabase
        .from("users").select("user_id").limit(1).single();
    if (adminError) throw adminError;
    const user = { user_id: admin.user_id, role_name: "SUPER_ADMIN" };
    const { data: employee, error: employeeError } = await supabase.from("employees").insert([{
        company_id: template.company_id, position_id: template.position_id,
        employee_code: marker, first_name: "Auto", last_name: "Attendance",
        gender: "MALE", date_of_birth: "1995-01-01",
        national_id: `8${String(Date.now()).slice(-14)}`, phone: "0781234567",
        address: "Integration test", hire_date: dateOffset(-7),
        monthly_salary: 30000, daily_rate: 1000, status: "ACTIVE"
    }]).select().single();
    if (employeeError) throw employeeError;
    ids.employee = employee.employee_id;

    for (let offset = -6; offset <= 0; offset += 1) {
        const attendance = await recordAttendance({
            employee_id: employee.employee_id, attendance_date: dateOffset(offset),
            check_in: "08:00", check_out: "17:00", attendance_status: "PRESENT"
        }, user);
        ids.attendances.push(attendance.attendance_id);
        assert(Number(attendance.hours_worked) === 9, "Expected server-calculated 9 working hours.");
        assert(Number(attendance.overtime_hours) === 1, "Expected automatic 1 overtime hour.");
    }

    const eligibility = await getAdvanceEligibility(employee.employee_id, user);
    assert(eligibility.worked_days === 7, `Expected 7 worked days, got ${eligibility.worked_days}`);
    assert(Number(eligibility.earned_amount) === 7875, `Expected earnings 7875, got ${eligibility.earned_amount}`);
    assert(Number(eligibility.allowed_advance) === 3937.5, `Expected allowed advance 3937.5, got ${eligibility.allowed_advance}`);
    const advance = await requestAdvance({ employee_id: employee.employee_id, amount: 3900, reason: marker }, user);
    ids.advances.push(advance.advance_id);
    let rejected = false;
    try {
        await requestAdvance({ employee_id: employee.employee_id, amount: 100, reason: marker }, user);
    } catch (error) {
        rejected = String(error.message).includes("exceeds the allowed half");
    }
    assert(rejected, "Advance over the remaining half-earnings cap was accepted.");
    console.log(JSON.stringify({ success: true, hours: 9, overtime: 1, eligibility, cap_rejected: true }));
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; }).finally(async () => {
    if (ids.advances.length) await supabase.from("salary_advances").delete().in("advance_id", ids.advances);
    if (ids.attendances.length) await supabase.from("attendance").delete().in("attendance_id", ids.attendances);
    if (ids.employee) await supabase.from("employees").delete().eq("employee_id", ids.employee);
});
