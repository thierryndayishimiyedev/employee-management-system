const normalizeRwandaPhone = (value) => {
    const raw = String(value || "").trim().replace(/[\s()-]/g, "");
    if (/^07[2389]\d{7}$/.test(raw)) return `+250${raw.slice(1)}`;
    if (/^2507[2389]\d{7}$/.test(raw)) return `+${raw}`;
    if (/^\+2507[2389]\d{7}$/.test(raw)) return raw;
    throw new Error("Phone must be a valid Rwanda mobile number.");
};

module.exports = { normalizeRwandaPhone };
