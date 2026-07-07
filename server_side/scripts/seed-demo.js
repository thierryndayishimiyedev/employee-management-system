require("dotenv").config();

const bcrypt = require("bcrypt");
const supabase = require("../src/config/supabase");

const today = new Date().toISOString().split("T")[0];

const demo = {
    admin: {
        username: "admin@miningops.rw",
        password: "admin123",
        full_name: "Demo Super Admin",
        phone: "250700000001",
        email: "admin@miningops.rw"
    },
    owner: {
        username: "owner@miningops.rw",
        password: "owner123",
        employee_code: "DEMO-OWNER",
        first_name: "Demo",
        last_name: "Owner",
        gender: "MALE",
        date_of_birth: "1985-01-01",
        national_id: "1000000000000001",
        phone: "250700000002",
        email: "owner@miningops.rw",
        address: "Demo owner address",
        hire_date: today,
        monthly_salary: 900000,
        daily_rate: 30000
    },
    manager: {
        username: "manager@miningops.rw",
        password: "manager123",
        employee_code: "DEMO-MANAGER",
        first_name: "Demo",
        last_name: "Manager",
        gender: "MALE",
        date_of_birth: "1990-01-01",
        national_id: "1000000000000002",
        phone: "250700000003",
        email: "manager@miningops.rw",
        address: "Demo manager address",
        hire_date: today,
        monthly_salary: 600000,
        daily_rate: 20000
    },
    accountant: {
        username: "accountant@miningops.rw",
        password: "acct123",
        employee_code: "DEMO-ACCOUNTANT",
        first_name: "Demo",
        last_name: "Accountant",
        gender: "FEMALE",
        date_of_birth: "1992-01-01",
        national_id: "1000000000000003",
        phone: "250700000004",
        email: "accountant@miningops.rw",
        address: "Demo accountant address",
        hire_date: today,
        monthly_salary: 450000,
        daily_rate: 15000
    },
    worker: {
        username: "worker@miningops.rw",
        password: "worker123",
        employee_code: "DEMO-WORKER",
        first_name: "Demo",
        last_name: "Worker",
        gender: "MALE",
        date_of_birth: "1998-01-01",
        national_id: "1000000000000004",
        phone: "250700000005",
        email: "worker@miningops.rw",
        address: "Demo worker address",
        hire_date: today,
        monthly_salary: 300000,
        daily_rate: 10000
    }
};

const ensureAdmin = async () => {
    const { data: existing } = await supabase
        .from("admins")
        .select("admin_id")
        .eq("username", demo.admin.username)
        .maybeSingle();

    if (existing) return existing;

    const password = await bcrypt.hash(demo.admin.password, 10);
    const { data, error } = await supabase
        .from("admins")
        .insert([{ ...demo.admin, password }])
        .select("admin_id")
        .single();

    if (error) throw error;
    return data;
};

const ensureRole = async (role_name, description) => {
    const { data: existing } = await supabase
        .from("roles")
        .select("*")
        .eq("role_name", role_name)
        .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
        .from("roles")
        .insert([{ role_name, description }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

const ensureCompany = async () => {
    const { data: existing } = await supabase
        .from("companies")
        .select("*")
        .eq("email", "demo.company@miningops.rw")
        .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
        .from("companies")
        .insert([{
            company_name: "Demo Mining Company",
            mining_license_number: "DEMO-LIC-001",
            tin_number: "DEMO-TIN-001",
            phone: "250700000010",
            email: "demo.company@miningops.rw",
            province: "Kigali City",
            district: "Gasabo",
            sector: "Kimironko",
            village: "Demo Village",
            address: "Demo company address",
            registration_date: today
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

const ensureDepartment = async (company_id, department_name, description) => {
    const { data: existing } = await supabase
        .from("departments")
        .select("*")
        .eq("company_id", company_id)
        .eq("department_name", department_name)
        .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
        .from("departments")
        .insert([{ company_id, department_name, description }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

const ensurePosition = async (department_id, position_name, description) => {
    const { data: existing } = await supabase
        .from("positions")
        .select("*")
        .eq("department_id", department_id)
        .eq("position_name", position_name)
        .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
        .from("positions")
        .insert([{ department_id, position_name, description }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

const ensureEmployeeUser = async ({ company, position, role, person }) => {
    const { data: existingUser } = await supabase
        .from("users")
        .select("*, employees(*)")
        .eq("username", person.username)
        .maybeSingle();

    if (existingUser) return existingUser;

    const { data: existingEmployee } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_code", person.employee_code)
        .maybeSingle();

    let employee = existingEmployee;

    if (!employee) {
        const { data, error } = await supabase
            .from("employees")
            .insert([{
                company_id: company.company_id,
                department_id: position.department_id,
                position_id: position.position_id,
                employee_code: person.employee_code,
                first_name: person.first_name,
                last_name: person.last_name,
                gender: person.gender,
                date_of_birth: person.date_of_birth,
                national_id: person.national_id,
                phone: person.phone,
                email: person.email,
                address: person.address,
                hire_date: person.hire_date,
                monthly_salary: person.monthly_salary,
                daily_rate: person.daily_rate,
                profile_photo: ""
            }])
            .select()
            .single();

        if (error) throw error;
        employee = data;
    }

    const password = await bcrypt.hash(person.password, 10);
    const { data: user, error: userError } = await supabase
        .from("users")
        .insert([{
            employee_id: employee.employee_id,
            role_id: role.role_id,
            username: person.username,
            password
        }])
        .select("*, employees(*)")
        .single();

    if (userError) throw userError;
    return user;
};

async function main() {
    await ensureAdmin();

    const roles = {
        OWNER: await ensureRole("OWNER", "Company Owner"),
        MANAGER: await ensureRole("MANAGER", "Company Manager"),
        ACCOUNTANT: await ensureRole("ACCOUNTANT", "Company Accountant"),
        WORKER: await ensureRole("WORKER", "Company Worker")
    };

    const company = await ensureCompany();
    const adminDepartment = await ensureDepartment(company.company_id, "Demo Administration", "Demo administration department");
    const miningDepartment = await ensureDepartment(company.company_id, "Demo Mining", "Demo mining operations");
    const financeDepartment = await ensureDepartment(company.company_id, "Demo Finance", "Demo finance department");

    const positions = {
        owner: await ensurePosition(adminDepartment.department_id, "Owner", "Company owner"),
        manager: await ensurePosition(adminDepartment.department_id, "Manager", "Company manager"),
        accountant: await ensurePosition(financeDepartment.department_id, "Accountant", "Company accountant"),
        worker: await ensurePosition(miningDepartment.department_id, "Miner", "Mining worker")
    };

    await ensureEmployeeUser({ company, position: positions.owner, role: roles.OWNER, person: demo.owner });
    await ensureEmployeeUser({ company, position: positions.manager, role: roles.MANAGER, person: demo.manager });
    await ensureEmployeeUser({ company, position: positions.accountant, role: roles.ACCOUNTANT, person: demo.accountant });
    await ensureEmployeeUser({ company, position: positions.worker, role: roles.WORKER, person: demo.worker });

    console.log(JSON.stringify({
        success: true,
        message: "Demo credentials are ready.",
        credentials: {
            super_admin: { username: demo.admin.username, password: demo.admin.password },
            owner: { username: demo.owner.username, password: demo.owner.password },
            manager: { username: demo.manager.username, password: demo.manager.password },
            accountant: { username: demo.accountant.username, password: demo.accountant.password },
            worker: { username: demo.worker.username, password: demo.worker.password }
        }
    }, null, 2));
}

main().catch((error) => {
    console.error(JSON.stringify({
        success: false,
        message: error.message
    }, null, 2));
    process.exit(1);
});
