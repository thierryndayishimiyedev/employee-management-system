const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const allow = require('../middleware/authorize.middleware');
const service = require('../services/operationalSummary.service');
router.get('/', auth, allow('OWNER','MANAGER','ACCOUNTANT'), async (req,res) => { try { res.json({ success:true, data:await service.summary(req.query, req.user) }); } catch (error) { res.status(400).json({ success:false, message:error.message }); } });
router.get('/pdf', auth, allow('OWNER','MANAGER','ACCOUNTANT'), async (req,res) => { try { const buffer = await service.pdf(req.query, req.user); res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition','attachment; filename="operational-summary.pdf"'); res.send(buffer); } catch (error) { res.status(400).json({ success:false, message:error.message }); } });
module.exports = router;
