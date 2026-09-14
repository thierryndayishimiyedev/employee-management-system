const { search } = require('../services/globalSearch.service');
module.exports = { search: async (req, res) => { try { res.json({ success: true, data: await search(req.query || {}, req.user) }); } catch (error) { res.status(400).json({ success: false, message: error.message }); } } };
