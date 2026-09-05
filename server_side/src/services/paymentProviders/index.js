const internalProvider = require("./internal.provider");

// There is intentionally no MTN adapter in this repository yet. Keeping this
// explicit prevents a credentials-only configuration from being mistaken for
// permission to move real money.
const hasLiveMtnAdapter = false;

const getPaymentReadiness = () => {
    const provider = String(process.env.PAYMENT_PROVIDER || "INTERNAL").toUpperCase();
    const isInternal = provider === "INTERNAL";
    const requiredForMtn = ["MTN_DISBURSEMENT_PRIMARY_KEY", "MTN_DISBURSEMENT_USER_ID", "MTN_DISBURSEMENT_API_KEY", "MTN_DISBURSEMENT_SUBSCRIPTION_KEY", "MTN_DISBURSEMENT_CALLBACK_URL", "MTN_WEBHOOK_SECRET_OR_SIGNATURE_KEY"];
    const missing = isInternal ? [] : requiredForMtn.filter((key) => !process.env[key]);
    return {
        provider,
        live_payments_enabled: false,
        sandbox_ready: !isInternal && missing.length === 0 && process.env.MTN_ENVIRONMENT === "sandbox" && hasLiveMtnAdapter,
        provider_adapter_installed: hasLiveMtnAdapter,
        wallet_balance_available: false,
        wallet_balance: null,
        wallet_currency: "RWF",
        missing_configuration: missing,
        callback_configured: Boolean(process.env.MTN_DISBURSEMENT_CALLBACK_URL),
        receiver_name_verification: process.env.MTN_VERIFY_RECEIVER_NAME === "true",
        message: isInternal ? "Internal test provider is active. No real money can be sent and no real SIM balance is available." : missing.length ? "MTN configuration is incomplete; real payments are blocked." : "MTN configuration exists, but the verified MTN adapter and callback handler are not installed. Real payments remain blocked."
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
