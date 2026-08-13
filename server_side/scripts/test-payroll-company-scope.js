// Read-only live authorization test. It changes no data.
// Run: node -r dotenv/config scripts/test-payroll-company-scope.js
const supabase = require("../src/config/supabase");
const { getPayrolls, getPayrollById } = require("../src/services/payroll.service");

const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function main() {
    const { data: payrolls, error: payrollError } = await supabase
        .from("payroll").select("payroll_id,employees!inner(company_id)").limit(500);
    if (payrollError) throw payrollError;
    const companyIds = [...new Set(payrolls.map((row) => row.employees.company_id))];
    const target = payrolls.find((row) => payrolls.some((other) => other.employees.company_id !== row.employees.company_id));
    assert(target, "At least two payroll companies are required for this authorization test.");
    const deniedCompany = target.employees.company_id;
    const allowed = payrolls.find((row) => row.employees.company_id !== deniedCompany);
    const allowedCompany = allowed.employees.company_id;
    const scope = { role_name: "ACCOUNTANT", user_id: "00000000-0000-0000-0000-000000000001", employee_id: "00000000-0000-0000-0000-000000000001", company_id: allowedCompany, company_ids: [allowedCompany] };
    const visible = await getPayrolls(scope);
    assert(visible.every((row) => row.employees.company_id === allowedCompany), "Cross-company payroll appeared in scoped payroll listing.");
    let denied = false;
    try { await getPayrollById(target.payroll_id, scope); }
    catch (_) { denied = true; }
    assert(denied, "Direct payroll ID lookup leaked another company's payroll.");
    const ownerScope = { ...scope, role_name: "OWNER", company_ids: [allowedCompany] };
    const ownerVisible = await getPayrolls(ownerScope);
    assert(ownerVisible.every((row) => row.employees.company_id === allowedCompany), "Owner scope leaked another company's payroll.");
    if (companyIds.length >= 3) {
        const secondAllowedCompany = companyIds.find((companyId) => companyId !== allowedCompany && companyId !== deniedCompany);
        const multiOwnerScope = { ...ownerScope, company_ids: [allowedCompany, secondAllowedCompany] };
        const multiOwnerVisible = await getPayrolls(multiOwnerScope);
        assert(multiOwnerVisible.length > 0 && multiOwnerVisible.every((row) => multiOwnerScope.company_ids.includes(row.employees.company_id)), "Multi-company owner scope leaked an unrelated payroll.");
        assert(multiOwnerVisible.some((row) => row.employees.company_id === allowedCompany) && multiOwnerVisible.some((row) => row.employees.company_id === secondAllowedCompany), "Multi-company owner scope did not include both authorized companies.");
    }
    console.log(JSON.stringify({ success: true, allowed_company: allowedCompany, denied_company: deniedCompany, accountant_listing_scoped: true, accountant_direct_id_denied: true, owner_listing_scoped: true, owner_multi_company_scope_verified: companyIds.length >= 3 }));
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
