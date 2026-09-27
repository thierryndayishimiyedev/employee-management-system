const service = require('../services/passwordReset.service');
const request = async (req, res) => { try { res.json({ success: true, data: await service.requestReset(req.body || {}, req.ip) }); } catch (error) { res.status(400).json({ success: false, message: error.message }); } };
const reset = async (req, res) => { try { res.json({ success: true, data: await service.resetPassword(req.body || {}) }); } catch (error) { res.status(400).json({ success: false, message: error.message }); } };
module.exports = { request, reset };
