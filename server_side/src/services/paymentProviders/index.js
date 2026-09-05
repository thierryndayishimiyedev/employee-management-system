const internalProvider = require("./internal.provider");

const getPaymentReadiness = () => {
    const provider = String(process.env.PAYMENT_PROVIDER || "INTERNAL").toUpperCase();
    const isInternal = provider === "INTERNAL";
    const requiredForMtn = ["MTN_COLLECTION_PRIMARY_KEY", "MTN_COLLECTION_USER_ID", "MTN_COLLECTION_SUBSCRIPTION_KEY", "MTN_COLLECTION_CALLBACK_URL"];
    const missing = isInternal ? [] : requiredForMtn.filter((key) => !process.env[key]);
    return {
        provider,
        live_payments_enabled: !isInternal && missing.length === 0 && process.env.MTN_ENVIRONMENT === "production",
        sandbox_ready: !isInternal && missing.length === 0 && process.env.MTN_ENVIRONMENT === "sandbox",
        missing_configuration: missing,
        callback_configured: Boolean(process.env.MTN_COLLECTION_CALLBACK_URL),
        receiver_name_verification: process.env.MTN_VERIFY_RECEIVER_NAME === "true",
        message: isInternal ? "Internal test provider is active. No real money can be sent." : missing.length ? "MTN provider is incomplete; real payments are blocked." : "MTN configuration is present. Complete sandbox callback tests before production activation."
    };
};

const getPaymentProvider = () => {
    const provider = process.env.PAYMENT_PROVIDER || "INTERNAL";

    if (provider !== "INTERNAL") {
        throw new Error(`Unsupported payment provider: ${provider}`);
    }

    return internalProvider;
};

module.exports = {
    getPaymentProvider,
    getPaymentReadiness
};
