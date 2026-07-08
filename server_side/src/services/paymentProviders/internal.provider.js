const { randomUUID } = require("crypto");

const processPayment = async (payment) => {
    if (process.env.INTERNAL_PAYMENT_SIMULATE_FAILURE === "true") {
        throw new Error("Internal payment provider failed");
    }

    return {
        transaction_id: `INT-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        reference_id: payment.reference_id || payment.transaction_reference || `PAY-${randomUUID()}`,
        provider: "INTERNAL"
    };
};

const verifyReceiver = async (employee) => ({
    success: true,
    receiver_name: [employee?.first_name, employee?.last_name].filter(Boolean).join(" ")
});

module.exports = {
    name: "INTERNAL",
    processPayment,
    verifyReceiver
};
