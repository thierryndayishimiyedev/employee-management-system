const { approveAdvance } = require("../services/advanceApproval.service");

const approve = async (req, res) => {

    try {

        const advance = await approveAdvance(req.params.id, req.user);

        res.json({
            success: true,
            message: "Advance approved successfully.",
            data: advance
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = { approve };
