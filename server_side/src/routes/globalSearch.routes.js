const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const controller = require('../controllers/globalSearch.controller');
router.get('/', authenticate, authorize('OWNER', 'MANAGER', 'ACCOUNTANT'), controller.search);
module.exports = router;
