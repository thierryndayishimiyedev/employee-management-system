const {
    getRoles,
    getRoleById
} = require("../services/role.service");

const fetchRoles = async (req, res) => {

    try {

        const roles = await getRoles();

        res.json({
            success: true,
            data: roles
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchRole = async (req, res) => {

    try {

        const role = await getRoleById(req.params.id);

        res.json({
            success: true,
            data: role
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    fetchRoles,
    fetchRole
};