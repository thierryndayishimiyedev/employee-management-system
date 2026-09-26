const router = require('express').Router(); const auth = require('../middleware/auth.middleware'); const allow = require('../middleware/authorize.middleware'); const service = require('../services/nightShift.service'); const out = (fn, status = 200) => async (req, res) => { try { res.status(status).json({ success: true, data: await fn(req) }); } catch (error) { res.status(400).json({ success: false, message: error.message }); } };
router.get('/', auth, allow('OWNER'), out((req) => service.list(req.user)));
router.get('/current', auth, allow('OWNER','MANAGER','ACCOUNTANT'), out((req) => service.current(req.user)));
router.put('/', auth, allow('OWNER'), out((req) => service.save(req.body || {}, req.user)));
router.post('/:id/close', auth, allow('OWNER'), out((req) => service.close(req.params.id, req.user)));
module.exports = router;
