const router = require('express').Router(); const auth = require('../middleware/auth.middleware'); const allow = require('../middleware/authorize.middleware'); const service = require('../services/monthlyStaff.service'); const out = (fn, status = 200) => async (req, res) => { try { res.status(status).json({ success: true, data: await fn(req) }); } catch (error) { res.status(400).json({ success: false, message: error.message }); } };
router.get('/', auth, allow('OWNER'), out((req) => service.list(req.user)));
router.post('/', auth, allow('OWNER'), out((req) => service.create(req.body || {}, req.user), 201));
router.post('/:id/advances', auth, allow('OWNER'), out((req) => service.requestAdvance(req.params.id, req.body || {}, req.user), 201));
router.post('/advances/:id/pay', auth, allow('OWNER'), out((req) => service.payAdvance(req.params.id, req.user)));
router.post('/:id/payroll', auth, allow('OWNER'), out((req) => service.generatePayroll(req.params.id, req.body || {}, req.user), 201));
router.post('/payroll/:id/pay', auth, allow('OWNER'), out((req) => service.payPayroll(req.params.id, req.user)));
module.exports = router;
