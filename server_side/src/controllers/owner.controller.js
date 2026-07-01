const {
    createOwner
} = require("../services/owner.service");

const registerOwner = async (req, res) => {

    try {

        const owner = await createOwner(req.body);

        res.status(201).json({
            success: true,
            message: "Owner created successfully.",
            data: owner
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    registerOwner
};