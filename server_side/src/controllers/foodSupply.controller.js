const service = require("../services/foodSupply.service");
const respond = (fn, status = 200) => async (req, res) => { try { res.status(status).json({ success: true, data: await fn(req, res) }); } catch (err) { res.status(400).json({ success: false, message: err.message }); } };
module.exports = {
    create: respond((req) => service.createFoodSupply(req.body || {}, req.user), 201),
    list: respond((req) => service.listFoodSupplies(req.user)),
    approve: respond((req) => service.reviewFoodSupply(req.params.id, "approve", req.body?.comments, req.user)),
    changes: respond((req) => service.reviewFoodSupply(req.params.id, "changes", req.body?.comments, req.user)),
    pay: respond((req) => service.payFoodSupply(req.params.id, req.user)),
    report: async (req, res) => { try { const csv = await service.foodSupplyCsv(req.user); res.setHeader("Content-Type", "text/csv; charset=utf-8"); res.setHeader("Content-Disposition", "attachment; filename=food-supply-report.csv"); res.send(csv); } catch (err) { res.status(400).json({ success: false, message: err.message }); } }
};
