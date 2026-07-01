const supabase = require("../config/supabase");

const verifyNames = (employee) => {

    // Temporary simulation.
    // Replace with MTN MoMo Name Verification API later.

    const fullName =
        `${employee.first_name} ${employee.last_name}`.trim().toUpperCase();

    return {
        success: true,
        beneficiary_name: fullName
    };

};

const payAllApprovedPayrolls = async () => {

    const { data: payrolls, error } = await supabase
        .from("payroll")
        .select(`
            *,
            employees(*)
        `)
        .eq("payment_status", "APPROVED");

    if (error) throw error;

    const results = [];

    let totalPaid = 0;

    for (const payroll of payrolls) {

        const employee = payroll.employees;

        const verification = verifyNames(employee);

        if (!verification.success) {

            await supabase
                .from("payments")
                .insert([{
                    payroll_id: payroll.payroll_id,
                    employee_id: employee.employee_id,
                    amount: payroll.net_salary,
                    phone: employee.phone,
                    beneficiary_name: verification.beneficiary_name,
                    payment_method: "MOBILE_MONEY",
                    payment_status: "FAILED",
                    failure_reason: "Name mismatch"
                }]);

            results.push({
                employee: employee.first_name + " " + employee.last_name,
                status: "FAILED"
            });

            continue;

        }

        const transactionReference =
            "MOMO-" + Date.now() + "-" + Math.floor(Math.random()*1000);

        await supabase
            .from("payments")
            .insert([{
                payroll_id: payroll.payroll_id,
                employee_id: employee.employee_id,
                amount: payroll.net_salary,
                phone: employee.phone,
                beneficiary_name: verification.beneficiary_name,
                payment_method: "MOBILE_MONEY",
                transaction_reference: transactionReference,
                payment_status: "SUCCESS"
            }]);

        await supabase
            .from("payroll")
            .update({
                payment_status: "PAID"
            })
            .eq("payroll_id", payroll.payroll_id);

        totalPaid += Number(payroll.net_salary);

        results.push({
            employee: employee.first_name + " " + employee.last_name,
            status: "PAID"
        });

    }

    return {

        total_workers: results.length,

        paid: results.filter(r=>r.status==="PAID").length,

        failed: results.filter(r=>r.status==="FAILED").length,

        total_amount: totalPaid,

        results

    };

};

module.exports = {
    payAllApprovedPayrolls
};