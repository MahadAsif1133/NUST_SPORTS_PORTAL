const freezeService = require('../services/freeze.service');

const requestFreeze = async (req, res, next) => {
  try {
    const result = await freezeService.requestFreeze({
      ...req.body,
      userId: req.user.id,
    }, req.ip);
    res.status(201).json({ freezeRequest: result });
  } catch (err) { next(err); }
};

const getMyFreezeRequests = async (req, res, next) => {
  try {
    const freezeRequests = await freezeService.getUserFreezeRequests(req.user.id);
    res.json({ freezeRequests });
  } catch (err) { next(err); }
};

module.exports = { requestFreeze, getMyFreezeRequests };
