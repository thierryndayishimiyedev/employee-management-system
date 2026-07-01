const supabase = require("../config/supabase");

const generatePayroll = async (employee_id, payroll_month, payroll_year) => {

    const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_id", employee_id)
        .single();

    if (employeeError || !employee)
        throw new Error("Employee not found.");

    const startDate = `${payroll_year}-${String(payroll_month).padStart(2, "0")}-01`;
    const endDate = `${payroll_year}-${String(payroll_month).padStart(2, "0")}-31`;

    const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee_id)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

    if (attendanceError) throw attendanceError;

    const daysWorked = attendance.filter(a => a.attendance_status === "PRESENT").length;

    const overtimeHours = attendance.reduce(
        (sum, a) => sum + Number(a.overtime_hours || 0),
        0
    );

    const basicSalary = daysWorked * Number(employee.daily_rate);

    const overtimePay = overtimeHours * (Number(employee.daily_rate) / 8);

    const { data: advances, error: advanceError } = await supabase
        .from("salary_advances")
        .select("amount")
        .eq("employee_id", employee_id)
        .eq("status", "APPROVED");

    if (advanceError) throw advanceError;

    const advanceDeduction = advances.reduce(
        (sum, a) => sum + Number(a.amount),
        0
    );

    const allowances = 0;
    const deductions = 0;

    const netSalary =
        basicSalary +
        overtimePay +
        allowances -
        deductions -
        advanceDeduction;

    const payrollData = {
        employee_id,
        payroll_month,
        payroll_year,
        days_worked: daysWorked,
        overtime_hours: overtimeHours,
        basic_salary: basicSalary,
        overtime_pay: overtimePay,
        allowances,
        deductions,
        advance_deduction: advanceDeduction,
        net_salary: netSalary
    };

    const { data: existing } = await supabase
        .from("payroll")
        .select("payroll_id")
        .eq("employee_id", employee_id)
        .eq("payroll_month", payroll_month)
        .eq("payroll_year", payroll_year)
        .maybeSingle();

    if (existing) {

        const { data, error } = await supabase
            .from("payroll")
            .update(payrollData)
            .eq("payroll_id", existing.payroll_id)
            .select()
            .single();

        if (error) throw error;

        return data;

    }

    const { data, error } = await supabase
        .from("payroll")
        .insert([payrollData])
        .select()
        .single();

    if (error) throw error;

    return data;

};

module.exports = {
    generatePayroll
};