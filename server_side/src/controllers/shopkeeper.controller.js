const service = require('../services/shopkeeper.service');
const create = async (req, res) => { try { res.status(201).json({ success: true, data: await service.createShopkeeper(req.body || {}, req.user) }); } catch (error) { res.status(400).json({ success: false, message: error.message }); } };
const list = async (req, res) => { try { res.json({ success: true, data: await service.getShopkeepers(req.user) }); } catch (error) { res.status(400).json({ success: false, message: error.message }); } };
module.exports = { create, list };
