const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/passwordReset.controller');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many reset attempts. Please try again later.' } });
router.post('/request', limiter, controller.request);
router.post('/confirm', limiter, controller.reset);
module.exports = router;
