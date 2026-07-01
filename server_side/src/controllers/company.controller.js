const {
    createCompany,
    getCompanies
} = require("../services/company.service");

const registerCompany = async (req, res) => {

    try {

        const company = await createCompany(req.body);

        return res.status(201).json({
            success: true,
            message: "Company created successfully.",
            data: company
        });

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchCompanies = async (req, res) => {

    try {

        const companies = await getCompanies();

        return res.status(200).json({
            success: true,
            data: companies
        });

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    registerCompany,
    fetchCompanies
};