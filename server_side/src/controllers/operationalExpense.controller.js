const service = require("../services/operationalExpense.service");
const respond = (fn, status = 200) => async (req, res) => { try { res.status(status).json({ success: true, data: await fn(req) }); } catch (error) { res.status(400).json({ success: false, message: error.message }); } };
module.exports = {
    create: respond((req) => service.createExpense(req.body || {}, req.user), 201),
    list: respond((req) => service.listExpenses(req.user)),
    approve: respond((req) => service.reviewExpense(req.params.id, "approve", req.body?.comments, req.user)),
    changes: respond((req) => service.reviewExpense(req.params.id, "changes", req.body?.comments, req.user)),
    pay: respond((req) => service.payExpense(req.params.id, req.user))
};
