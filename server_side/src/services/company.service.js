const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds } = require("../utils/companyScope");

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
        .insert([{
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
        }])
        .select()
        .single();

    if (error) throw error;

    return data;
};

const getCompanies = async (user = null) => {

    let query = supabase
        .from("companies")
        .select("*");

    if (!isSuperAdmin(user)) {
        const allowedCompanyIds = requireCompanyIds(user);
        query = query.in("company_id", allowedCompanyIds);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return data;
};

const getCompanyById = async (id, user = null) => {

    let query = supabase
        .from("companies")
        .select("*")
        .eq("company_id", id);

    if (!isSuperAdmin(user)) {
        const allowedCompanyIds = requireCompanyIds(user);
        if (!allowedCompanyIds.includes(id)) {
            throw new Error("Forbidden: company does not belong to your assigned companies.");
        }
    }

    const { data, error } = await query.single();

    if (error) throw error;

    return data;
};

const updateCompany = async (id, companyData) => {

    const { data, error } = await supabase
        .from("companies")
        .update(companyData)
        .eq("company_id", id)
        .select()
        .single();

    if (error) throw error;

    return data;
};

const deleteCompany = async (id) => {

    const { error } = await supabase
        .from("companies")
        .delete()
        .eq("company_id", id);

    if (error) {

        if (error.message.includes("foreign key")) {
            throw new Error(
                "This company cannot be deleted because it has employees."
            );
        }

        throw error;
    }

    return {
        message: "Company deleted successfully."
    };

};
module.exports = {
    createCompany,
    getCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
};