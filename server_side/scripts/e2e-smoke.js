require("dotenv").config();

const axios = require("axios");
const { createAdmin } = require("../src/services/admin.service");

const API_URL = process.env.E2E_API_URL || "http://127.0.0.1:5000/api";
const stamp = Date.now();

const adminCredentials = {
    username: `smoke.admin.${stamp}`,
    password: "SmokePass123!",
    full_name: "Smoke Test Admin",
    phone: `25078${String(stamp).slice(-7)}`,
    email: `smoke.admin.${stamp}@example.com`
};

const today = new Date().toISOString().split("T")[0];
const month = new Date().getMonth() + 1;
const year = new Date().getFullYear();

const post = async (url, body, token) => {
    const response = await axios.post(`${API_URL}${url}`, body, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    return response.data.data;
};

const put = async (url, body, token) => {
    const response = await axios.put(`${API_URL}${url}`, body, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    return response.data.data;
};

const get = async (url, token) => {
    const response = await axios.get(`${API_URL}${url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    return response.data.data;
};

const idOf = (record, key) => {
    if (!record?.[key]) {
        throw new Error(`Missing ${key} in response: ${JSON.stringify(record)}`);
    }

    return record[key];
};

async function main() {
    await createAdmin(adminCredentials);

    const login = await post("/auth/login", {
        username: adminCredentials.username,
        password: adminCredentials.password
    });

    const adminToken = login.token;

    const company = await post("/companies", {
        company_name: `Smoke Mining ${stamp}`,
        mining_license_number: `LIC-${stamp}`,
        tin_number: `TIN-${stamp}`,
        phone: `25079${String(stamp).slice(-7)}`,
        email: `company.${stamp}@example.com`,
        province: "Kigali City",
        district: "Gasabo",
        sector: "Kimironko",
        village: "Smoke Village",
        address: "Smoke test address",
        registration_date: today
    }, adminToken);

    const department = await post("/departments", {
        company_id: idOf(company, "company_id"),
        department_name: `Smoke Operations ${stamp}`,
        description: "E2E smoke department"
    }, adminToken);

    const workerPosition = await post("/positions", {
        department_id: idOf(department, "department_id"),
        position_name: `Smoke Worker ${stamp}`,
        description: "E2E smoke worker position"
    }, adminToken);

    const accountantPosition = await post("/positions", {
        department_id: idOf(department, "department_id"),
        position_name: `Smoke Accountant ${stamp}`,
        description: "E2E smoke accountant position"
    }, adminToken);

    const worker = await post("/workers", {
        company_id: idOf(company, "company_id"),
        position_id: idOf(workerPosition, "position_id"),
        employee_code: `WRK${String(stamp).slice(-8)}`,
        first_name: "Smoke",
        last_name: "Worker",
        gender: "MALE",
        date_of_birth: "1995-01-01",
        national_id: `1${String(stamp).slice(-15).padStart(15, "0")}`,
        phone: `25072${String(stamp).slice(-7)}`,
        email: `worker.${stamp}@example.com`,
        address: "Smoke worker address",
        hire_date: today,
        monthly_salary: 300000,
        daily_rate: 10000,
        profile_photo: "",
        username: `smoke.worker.${stamp}`,
        password: "SmokePass123!",
        role_name: "WORKER"
    }, adminToken);

    const accountant = await post("/accountants", {
        company_id: idOf(company, "company_id"),
        position_id: idOf(accountantPosition, "position_id"),
        employee_code: `ACC${String(stamp).slice(-8)}`,
        first_name: "Smoke",
        last_name: "Accountant",
        gender: "FEMALE",
        date_of_birth: "1993-01-01",
        national_id: `2${String(stamp).slice(-15).padStart(15, "0")}`,
        phone: `25073${String(stamp).slice(-7)}`,
        email: `accountant.${stamp}@example.com`,
        address: "Smoke accountant address",
        hire_date: today,
        monthly_salary: 450000,
        daily_rate: 15000,
        profile_photo: "",
        username: `smoke.accountant.${stamp}`,
        password: "SmokePass123!"
    }, adminToken);

    const accountantLogin = await post("/auth/login", {
        username: `smoke.accountant.${stamp}`,
        password: "SmokePass123!"
    });

    const accountantToken = accountantLogin.token;
    const employeeId = idOf(worker.employee, "employee_id");

    await post("/attendance", {
        employee_id: employeeId,
        attendance_date: today,
        check_in: "08:00",
        check_out: "17:00",
        hours_worked: 8,
        overtime_hours: 1,
        attendance_status: "PRESENT",
        remarks: "Smoke attendance"
    }, adminToken);

    await post("/production", {
        employee_id: employeeId,
        production_date: today,
        mineral_type: "Cassiterite",
        quantity: 25,
        unit: "kg",
        remarks: "Smoke production"
    }, adminToken);

    const payroll = await post("/payroll/generate", {
        employee_id: employeeId,
        payroll_month: month,
        payroll_year: year
    }, adminToken);

    const approvedPayroll = await put(`/payroll-approvals/${idOf(payroll, "payroll_id")}/approve`, {}, adminToken);
    const paymentResult = await post("/payments/pay-all", {}, adminToken);

    const report = await post("/reports", {
        company_id: idOf(company, "company_id"),
        report_date: today,
        title: `Smoke Report ${stamp}`,
        report_content: "Smoke report content"
    }, accountantToken);

    await put(`/reports/${idOf(report, "report_id")}/read`, {}, accountantToken);
    await put(`/reports/${idOf(report, "report_id")}/send`, {}, accountantToken);

    const [payments, payrolls, reports] = await Promise.all([
        get("/payments", adminToken),
        get("/payroll", adminToken),
        get("/reports", accountantToken)
    ]);

    console.log(JSON.stringify({
        success: true,
        api_url: API_URL,
        login_role: login.user.role_name,
        company_id: company.company_id,
        worker_employee_id: employeeId,
        accountant_user_id: accountant.user.user_id,
        payroll_id: payroll.payroll_id,
        approved_status: approvedPayroll.payment_status,
        payment_summary: paymentResult,
        report_id: report.report_id,
        counts: {
            payrolls: payrolls.length,
            payments: payments.length,
            reports: reports.length
        }
    }, null, 2));
}

main().catch((error) => {
    const response = error.response?.data;
    console.error(JSON.stringify({
        success: false,
        message: response?.message || error.message,
        details: response || null
    }, null, 2));
    process.exit(1);
});
