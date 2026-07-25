const { queryAuditLogs } = require('../services/audit.service');

const getLogs = async (req, res, next) => {
  try {
    const result = await queryAuditLogs({
      action: req.query.action,
      actorId: req.query.actorId,
      targetType: req.query.targetType,
      targetId: req.query.targetId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 50,
    });
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = { getLogs };
