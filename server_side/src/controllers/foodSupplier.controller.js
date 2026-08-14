const service = require("../services/foodSupplier.service");
const create = async (req, res) => { try { const data = await service.createFoodSupplier(req.body || {}, req.user); res.status(201).json({ success: true, data }); } catch (err) { res.status(400).json({ success: false, message: err.message }); } };
const list = async (req, res) => { try { res.json({ success: true, data: await service.getFoodSuppliers(req.user) }); } catch (err) { res.status(400).json({ success: false, message: err.message }); } };
module.exports = { create, list };
