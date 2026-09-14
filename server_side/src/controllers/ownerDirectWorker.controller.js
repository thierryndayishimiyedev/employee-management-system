const service = require('../services/ownerDirectWorker.service');

const respond = (fn, status = 200) => async (req, res) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  list: respond((req) => service.listDirectWorkers(req.user)),
  create: respond((req) => service.createDirectWorker(req.body || {}, req.user), 201),
  pay: respond((req) => service.payDirectWorker(req.params.id, req.user))
};
