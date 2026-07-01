const supabase = require("../config/supabase");

const createCompany = async (companyData) => {

    const {
        company_name,
        mining_license_number,
        tin_number,
        phone,
        email,
        province,
        district,
        sector,
        village,
        address,
        registration_date
    } = companyData;

    const { data, error } = await supabase
        .from("companies")
        .insert([
            {
                company_name,
                mining_license_number,
                tin_number,
                phone,
                email,
                province,
                district,
                sector,
                village,
                address,
                registration_date
            }
        ])
        .select();

    if (error) throw error;

    return data[0];
};

const getCompanies = async () => {

    const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;

    return data;
};

module.exports = {
    createCompany,
    getCompanies
};