const {
    createCompany,
    getCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
} = require("../services/company.service");

const registerCompany = async (req, res) => {

    try {

        const company = await createCompany(req.body);

        res.status(201).json({
            success: true,
            message: "Company created successfully.",
            data: company
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchCompanies = async (req, res) => {

    try {

        const companies = await getCompanies();

        res.json({
            success: true,
            data: companies
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchCompany = async (req, res) => {

    try {

        const company = await getCompanyById(req.params.id);

        res.json({
            success: true,
            data: company
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const editCompany = async (req, res) => {

    try {

        const company = await updateCompany(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Company updated successfully.",
            data: company
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const removeCompany = async (req, res) => {

    try {

        const result = await deleteCompany(req.params.id);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    registerCompany,
    fetchCompanies,
    fetchCompany,
    editCompany,
    removeCompany
};