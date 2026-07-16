const {
    createDepartment,
    getDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
} = require("../services/department.service");

const registerDepartment = async (req, res) => {

    try {

        const department = await createDepartment(req.body, req.user);

        res.status(201).json({
            success: true,
            message: "Department created successfully.",
            data: department
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchDepartments = async (req, res) => {

    try {

        const departments = await getDepartments(req.user);

        res.json({
            success: true,
            data: departments
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchDepartment = async (req, res) => {

    try {

        const department = await getDepartmentById(req.params.id, req.user);

        res.json({
            success: true,
            data: department
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const editDepartment = async (req, res) => {

    try {

        const department = await updateDepartment(
            req.params.id,
            req.body,
            req.user
        );

        res.json({
            success: true,
            message: "Department updated successfully.",
            data: department
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const removeDepartment = async (req, res) => {

    try {

        await deleteDepartment(req.params.id, req.user);

        res.json({
            success: true,
            message: "Department deleted successfully."
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    registerDepartment,
    fetchDepartments,
    fetchDepartment,
    editDepartment,
    removeDepartment
};
