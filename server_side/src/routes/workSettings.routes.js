const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const allow = require('../middleware/authorize.middleware');
const service = require('../services/workSettings.service');
router.get('/', auth, allow('OWNER','MANAGER','ACCOUNTANT'), async (req,res) => { try { res.json({ success:true, data:await service.get(req.user) }); } catch (error) { res.status(400).json({ success:false, message:error.message }); } });
router.put('/', auth, allow('OWNER'), async (req,res) => { try { res.json({ success:true, data:await service.save(req.body || {}, req.user) }); } catch (error) { res.status(400).json({ success:false, message:error.message }); } });
module.exports = router;
