const { randomUUID } = require("crypto");
const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");
const { getPaymentProvider } = require("./paymentProviders");

const PAYMENT_METHOD = "MTN_MOBILE_MONEY";
const READY_STATUSES = ["APPROVED"];
const MTN_PREFIXES = (process.env.MTN_PHONE_PREFIXES || "25078,25079,078,079")
    .split(",")
    .map((prefix) => prefix.trim())
    .filter(Boolean);

const isPaymentStatusConstraintError = (error) => {
    return (
        error?.code === "23514" &&
        String(error?.message || "").includes("payments_payment_status_check")
    );
};

const isPayrollStatusConstraintError = (error) => {
    return (
        error?.code === "23514" &&
        String(error?.message || "").includes("payroll_payment_status_check")
    );
};

const legacyPaymentStatus = (status) => {
    if (status === "PAID") return "SUCCESS";
    if (String(status || "").startsWith("FAILED")) return "FAILED";
    return process.env.PAYMENT_LEGACY_PENDING_STATUS || "PENDING";
};

const olderLegacyPaymentStatus = (status) => {
    if (String(status || "").startsWith("FAILED")) return "FAILED";
    return "SUCCESS";
};

const legacyPayrollStatus = (status) => {
    if (status === "PAID") return "PAID";
    if (status === "FAILED") return "FAILED";
    return "APPROVED";
};

const normalizePhone = (phone) => String(phone || "").replace(/[^\d+]/g, "");

const isValidPhone = (phone) => /^(?:\+?2507\d{8}|07\d{8})$/.test(normalizePhone(phone));

const isMtnPhone = (phone) => {
    const normalized = normalizePhone(phone).replace(/^\+/, "");
    return MTN_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

const employeeName = (employee) => [employee?.first_name, employee?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

const getCompanyWalletBalance = async () => {
    if (process.env.MTN_COMPANY_WALLET_BALANCE) {
        return Number(process.env.MTN_COMPANY_WALLET_BALANCE);
    }

    return Number.MAX_SAFE_INTEGER;
};

const verifyReceiverName = async (employee) => {
    const provider = getPaymentProvider();

    if (process.env.MTN_VERIFY_RECEIVER_NAME !== "true") {
        return {
            success: true,
            skipped: true,
            receiver_name: employeeName(employee)
        };
    }

    return provider.verifyReceiver(employee);
};

const validatePayrollEmployee = async (payroll) => {
    const employee = payroll.employees;

    if (!employee) return "Employee does not exist";
    if (employee.status && employee.status !== "ACTIVE") return "Employee is not active";
    if (!READY_STATUSES.includes(payroll.payment_status)) return "Payroll is not approved";
    if (Number(payroll.net_salary || 0) <= 0) return "Salary must be greater than zero";
    if (!employee.phone) return "Phone is missing";
    if (!isValidPhone(employee.phone)) return "Invalid phone";
    if (!isMtnPhone(employee.phone)) return "Receiver phone is not an MTN number";

    const verification = await verifyReceiverName(employee);
    if (!verification.success) return "Receiver Name Mismatch";

    return null;
};

const insertPayment = async (payment) => {
    const intendedStatus = payment.payment_status;
    const enhanced = {
        payroll_id: payment.payroll_id,
        employee_id: payment.employee_id,
        company_id: payment.company_id,
        amount: payment.amount,
        receiver_phone: payment.receiver_phone,
        receiver_name: payment.receiver_name,
        phone: payment.receiver_phone,
        beneficiary_name: payment.receiver_name,
        payment_method: payment.payment_method,
        transaction_id: payment.transaction_id,
        reference_id: payment.reference_id,
        transaction_reference: payment.reference_id,
        payment_status: intendedStatus,
        failure_reason: payment.failure_reason,
        created_by: payment.created_by,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from("payments")
        .insert([enhanced])
        .select()
        .single();

    if (!error) return { ...data, payment_status: intendedStatus };

    if (isPaymentStatusConstraintError(error)) {
        const retry = await supabase
            .from("payments")
            .insert([{ ...enhanced, payment_status: legacyPaymentStatus(intendedStatus) }])
            .select()
            .single();

        if (!retry.error) return { ...retry.data, payment_status: intendedStatus };

        if (isPaymentStatusConstraintError(retry.error)) {
            const olderRetry = await supabase
                .from("payments")
                .insert([{ ...enhanced, payment_status: olderLegacyPaymentStatus(intendedStatus) }])
                .select()
                .single();

            if (!olderRetry.error) return { ...olderRetry.data, payment_status: intendedStatus };
        }
    }

    const legacy = {
        payroll_id: payment.payroll_id,
        employee_id: payment.employee_id,
        amount: payment.amount,
        phone: payment.receiver_phone,
        beneficiary_name: payment.receiver_name,
        payment_method: payment.payment_method,
        transaction_reference: payment.reference_id,
        payment_status: intendedStatus,
        failure_reason: payment.failure_reason
    };

    const fallback = await supabase
        .from("payments")
        .insert([legacy])
        .select()
        .single();

    if (!fallback.error) return { ...fallback.data, payment_status: intendedStatus };

    if (isPaymentStatusConstraintError(fallback.error)) {
        const retry = await supabase
            .from("payments")
            .insert([{ ...legacy, payment_status: legacyPaymentStatus(intendedStatus) }])
            .select()
            .single();

        if (!retry.error) return { ...retry.data, payment_status: intendedStatus };

        if (isPaymentStatusConstraintError(retry.error)) {
            const olderRetry = await supabase
                .from("payments")
                .insert([{ ...legacy, payment_status: olderLegacyPaymentStatus(intendedStatus) }])
                .select()
                .single();

            if (olderRetry.error) throw olderRetry.error;
            return { ...olderRetry.data, payment_status: intendedStatus };
        }

        throw retry.error;
    }

    throw fallback.error;
};

const updatePayment = async (payment_id, updates) => {
    const intendedStatus = updates.payment_status;
    const enhanced = {
        ...updates,
        paid_at: updates.payment_status === "PAID" ? new Date().toISOString() : updates.paid_at,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from("payments")
        .update(enhanced)
        .eq("payment_id", payment_id)
        .select()
        .single();

    if (!error) return intendedStatus ? { ...data, payment_status: intendedStatus } : data;

    if (isPaymentStatusConstraintError(error)) {
        const retry = await supabase
            .from("payments")
            .update({
                ...enhanced,
                payment_status: legacyPaymentStatus(intendedStatus)
            })
            .eq("payment_id", payment_id)
            .select()
            .single();

        if (!retry.error) return { ...retry.data, payment_status: intendedStatus };

        if (isPaymentStatusConstraintError(retry.error)) {
            const olderRetry = await supabase
                .from("payments")
                .update({
                    ...enhanced,
                    payment_status: olderLegacyPaymentStatus(intendedStatus)
                })
                .eq("payment_id", payment_id)
                .select()
                .single();

            if (!olderRetry.error) return { ...olderRetry.data, payment_status: intendedStatus };
        }
    }

    const legacy = {
        payment_status: intendedStatus,
        failure_reason: updates.failure_reason,
        transaction_reference: updates.reference_id || updates.transaction_reference
    };

    Object.keys(legacy).forEach((key) => {
        if (legacy[key] === undefined) delete legacy[key];
    });

    const fallback = await supabase
        .from("payments")
        .update(legacy)
        .eq("payment_id", payment_id)
        .select()
        .single();

    if (!fallback.error) return intendedStatus ? { ...fallback.data, payment_status: intendedStatus } : fallback.data;

    if (isPaymentStatusConstraintError(fallback.error)) {
        const retry = await supabase
            .from("payments")
            .update({
                ...legacy,
                payment_status: legacyPaymentStatus(intendedStatus)
            })
            .eq("payment_id", payment_id)
            .select()
            .single();

        if (!retry.error) return { ...retry.data, payment_status: intendedStatus };

        if (isPaymentStatusConstraintError(retry.error)) {
            const olderRetry = await supabase
                .from("payments")
                .update({
                    ...legacy,
                    payment_status: olderLegacyPaymentStatus(intendedStatus)
                })
                .eq("payment_id", payment_id)
                .select()
                .single();

            if (olderRetry.error) throw olderRetry.error;
            return { ...olderRetry.data, payment_status: intendedStatus };
        }

        throw retry.error;
    }

    throw fallback.error;
};

const createPaymentQueue = async (payrolls, user) => {
    const queue = [];

    for (const payroll of payrolls) {
        const employee = payroll.employees;
        const failureReason = await validatePayrollEmployee(payroll);
        const payment = await insertPayment({
            payroll_id: payroll.payroll_id,
            employee_id: payroll.employee_id,
            company_id: employee?.company_id || payroll.company_id,
            amount: Number(payroll.net_salary || 0),
            receiver_phone: employee?.phone || null,
            receiver_name: employeeName(employee),
            payment_method: PAYMENT_METHOD,
            reference_id: `PAY-${randomUUID()}`,
            payment_status: failureReason ? "FAILED_VALIDATION" : "READY",
            failure_reason: failureReason,
            created_by: user?.user_id || null
        });

        queue.push({
            ...payment,
            payroll,
            employee,
            payment_status: payment.payment_status || (failureReason ? "FAILED_VALIDATION" : "READY")
        });
    }

    return queue;
};

const processPaymentWithProvider = async (payment) => {
    const provider = getPaymentProvider();
    return provider.processPayment(payment);
};

const updatePayrollStatuses = async (payrolls, paidPayments, failedPayments) => {
    for (const payroll of payrolls) {
        const paid = paidPayments.some((payment) => payment.payroll_id === payroll.payroll_id);
        const failed = failedPayments.some((payment) => payment.payroll_id === payroll.payroll_id);

        const payment_status = paid ? "PAID" : failed ? "FAILED" : "FAILED";

        const { error } = await supabase
            .from("payroll")
            .update({ payment_status })
            .eq("payroll_id", payroll.payroll_id);

        if (isPayrollStatusConstraintError(error)) {
            await supabase
                .from("payroll")
                .update({ payment_status: legacyPayrollStatus(payment_status) })
                .eq("payroll_id", payroll.payroll_id);
        } else if (error) {
            throw error;
        }
    }
};

const payAllApprovedPayrolls = async (filters = {}, user = null) => {
    let query = supabase
        .from("payroll")
        .select(`
            *,
            employees!inner(*)
        `)
        .eq("payment_status", "APPROVED");

    if (!isSuperAdmin(user)) {
        query = query.eq("employees.company_id", requireCompanyId(user));
    }

    if (filters.payroll_id) query = query.eq("payroll_id", filters.payroll_id);
    if (filters.payroll_month) query = query.eq("payroll_month", filters.payroll_month);
    if (filters.payroll_year) query = query.eq("payroll_year", filters.payroll_year);

    const { data: payrolls, error } = await query;

    if (error) throw error;
    if (!payrolls?.length) throw new Error("No approved payroll records found.");

    const queue = await createPaymentQueue(payrolls, user);
    const ready = queue.filter((payment) => payment.payment_status === "READY");
    const failedValidation = queue.filter((payment) => payment.payment_status === "FAILED_VALIDATION");
    const readyTotal = ready.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const balance = await getCompanyWalletBalance();

    if (balance < readyTotal) {
        for (const payment of ready) {
            await updatePayment(payment.payment_id, {
                payment_status: "FAILED_INSUFFICIENT_BALANCE",
                failure_reason: "Insufficient Company Balance"
            });
        }

        await updatePayrollStatuses(payrolls, [], ready);

        throw new Error("Insufficient Company Balance.");
    }

    await Promise.all(payrolls.map(async (payroll) => {
        const { error } = await supabase
            .from("payroll")
            .update({ payment_status: "PAYMENT_PROCESSING" })
            .eq("payroll_id", payroll.payroll_id);

        if (isPayrollStatusConstraintError(error)) {
            await supabase
                .from("payroll")
                .update({ payment_status: "APPROVED" })
                .eq("payroll_id", payroll.payroll_id);
        } else if (error) {
            throw error;
        }
    }));

    const paidPayments = [];
    const failedPayments = [...failedValidation];

    for (const payment of ready) {
        await updatePayment(payment.payment_id, { payment_status: "PROCESSING" });

        try {
            const transaction = await processPaymentWithProvider(payment);
            const paidPayment = await updatePayment(payment.payment_id, {
                payment_status: "PAID",
                transaction_id: transaction.transaction_id,
                reference_id: transaction.reference_id,
                transaction_reference: transaction.reference_id
            });

            paidPayments.push(paidPayment);
        } catch (err) {
            const failedPayment = await updatePayment(payment.payment_id, {
                payment_status: "FAILED_NETWORK",
                failure_reason: err.message || "Payment failed"
            });

            failedPayments.push(failedPayment);
        }
    }

    await updatePayrollStatuses(payrolls, paidPayments, failedPayments);

    const totalPaid = paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const failedAmount = failedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
        message: "Payroll payment processing completed.",
        employees: queue.length,
        paid: paidPayments.length,
        failed: failedPayments.length,
        total_paid: totalPaid,
        failed_amount: failedAmount,
        queue: queue.map((payment) => ({
            payment_id: payment.payment_id,
            payroll_id: payment.payroll_id,
            employee_id: payment.employee_id,
            employee: employeeName(payment.employee),
            phone: payment.receiver_phone || payment.phone,
            amount: Number(payment.amount || 0),
            status: payment.payment_status,
            failure_reason: payment.failure_reason || null
        }))
    };
};

const getPayments = async (user) => {

    let query = supabase
        .from("payments")
        .select(`
            *,
            employees!inner(
                employee_code,
                first_name,
                last_name,
                company_id
            )
        `)
        .order("payment_date", {
            ascending: false
        });

    if (!isSuperAdmin(user)) {
        query = query.eq("employees.company_id", requireCompanyId(user));
    }

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getPaymentById = async (id, user) => {

    let query = supabase
        .from("payments")
        .select(`
            *,
            employees!inner(
                employee_code,
                first_name,
                last_name,
                company_id
            )
        `)
        .eq("payment_id", id);

    if (!isSuperAdmin(user)) {
        query = query.eq("employees.company_id", requireCompanyId(user));
    }

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const getPaymentReport = async (user) => {
    const payments = await getPayments(user);

    return payments.map((payment) => {
        const dateValue = payment.paid_at || payment.payment_date || payment.created_at;
        const date = dateValue ? new Date(dateValue) : null;

        return {
            employee: employeeName(payment.employees),
            phone: payment.receiver_phone || payment.phone || "-",
            salary: Number(payment.amount || 0),
            transaction_id: payment.transaction_id || payment.transaction_reference || "-",
            reference_id: payment.reference_id || payment.transaction_reference || "-",
            payment_status: payment.payment_status,
            failure_reason: payment.failure_reason || "",
            date: date ? date.toISOString().split("T")[0] : "",
            time: date ? date.toISOString().split("T")[1].slice(0, 8) : ""
        };
    });
};

const getPaymentReportCsv = async (user) => {
    const rows = await getPaymentReport(user);
    const headers = [
        "Employee",
        "Phone",
        "Salary",
        "Transaction ID",
        "Reference ID",
        "Payment Status",
        "Failure Reason",
        "Date",
        "Time"
    ];

    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
        headers.map(escape).join(","),
        ...rows.map((row) => [
            row.employee,
            row.phone,
            row.salary,
            row.transaction_id,
            row.reference_id,
            row.payment_status,
            row.failure_reason,
            row.date,
            row.time
        ].map(escape).join(","))
    ];

    return lines.join("\n");
};

const deletePayment = async (id, user) => {

    await getPaymentById(id, user);

    const { error } = await supabase
        .from("payments")
        .delete()
        .eq("payment_id", id);

    if (error)
        throw error;

    return true;

};

module.exports = {
    payAllApprovedPayrolls,
    getPayments,
    getPaymentById,
    getPaymentReport,
    getPaymentReportCsv,
    deletePayment
};
