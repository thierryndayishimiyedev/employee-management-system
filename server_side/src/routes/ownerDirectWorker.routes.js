const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const controller = require('../controllers/ownerDirectWorker.controller');

// Direct-worker deals are private to the Owner and do not enter payroll.
router.get('/', authenticate, authorize('OWNER'), controller.list);
router.post('/', authenticate, authorize('OWNER'), controller.create);
router.post('/:id/pay', authenticate, authorize('OWNER'), controller.pay);

module.exports = router;
