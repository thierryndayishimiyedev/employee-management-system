const { reviewAdvance, payAdvance } = require("../services/advanceApproval.service");

const approve = async (req, res) => {

    try {

        const advance = await reviewAdvance(req.params.id, "approve", req.body?.reason, req.user);

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

const reject = async (req, res) => {
    try { res.json({ success: true, data: await reviewAdvance(req.params.id, "reject", req.body?.reason, req.user) }); }
    catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
const pay = async (req, res) => {
    try { res.json({ success: true, message: "Internal/test advance payment processed.", data: await payAdvance(req.params.id, req.user) }); }
    catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

module.exports = { approve, reject, pay };
