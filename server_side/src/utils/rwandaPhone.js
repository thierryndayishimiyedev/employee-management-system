const normalizeRwandaPhone = (value) => {
    const raw = String(value || "").trim().replace(/[\s()-]/g, "");
    if (/^07[2389]\d{7}$/.test(raw)) return `+250${raw.slice(1)}`;
    if (/^2507[2389]\d{7}$/.test(raw)) return `+${raw}`;
    if (/^\+2507[2389]\d{7}$/.test(raw)) return raw;
    throw new Error("Phone must be a valid Rwanda mobile number.");
};

const normalizeMtnRwandaPhone = (value) => {
    const raw = String(value || "").trim().replace(/[\s()-]/g, "");
    // MTN Rwanda mobile prefixes are 078 and 079. Airtel and other prefixes
    // are intentionally refused for worker payment details.
    if (/^07[89]\d{7}$/.test(raw)) return `+250${raw.slice(1)}`;
    if (/^2507[89]\d{7}$/.test(raw)) return `+${raw}`;
    if (/^\+2507[89]\d{7}$/.test(raw)) return raw;
    throw new Error("Worker phone must be a valid MTN Rwanda number (078… or 079…).");
};

module.exports = { normalizeRwandaPhone, normalizeMtnRwandaPhone };
