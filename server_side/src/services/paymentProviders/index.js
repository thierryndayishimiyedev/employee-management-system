const internalProvider = require("./internal.provider");

const getPaymentProvider = () => {
    const provider = process.env.PAYMENT_PROVIDER || "INTERNAL";

    if (provider !== "INTERNAL") {
        throw new Error(`Unsupported payment provider: ${provider}`);
    }

    return internalProvider;
};

module.exports = {
    getPaymentProvider
};
