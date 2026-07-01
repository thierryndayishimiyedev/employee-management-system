const {
    createAccountant,
    getAccountants,
    getAccountantById,
    updateAccountant,
    deactivateAccountant
} = require("../services/accountant.service");

const registerAccountant = async (req, res) => {

    try {

        const accountant = await createAccountant(req.body);

        res.status(201).json({
            success: true,
            message: "Accountant created successfully.",
            data: accountant
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchAccountants = async (req, res) => {

    try {

        const accountants = await getAccountants();

        res.json({
            success: true,
            data: accountants
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchAccountant = async (req, res) => {

    try {

        const accountant = await getAccountantById(req.params.id);

        res.json({
            success: true,
            data: accountant
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const editAccountant = async (req, res) => {

    try {

        const accountant = await updateAccountant(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Accountant updated successfully.",
            data: accountant
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const removeAccountant = async (req, res) => {

    try {

        await deactivateAccountant(req.params.id);

        res.json({
            success: true,
            message: "Accountant deactivated successfully."
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
    registerAccountant,
    fetchAccountants,
    fetchAccountant,
    editAccountant,
    removeAccountant
};