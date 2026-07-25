const trainerService = require('../services/trainer.service');

const scan = async (req, res, next) => {
  try {
    const result = await trainerService.scanQRCode({
      ...req.body,
      scannedById: req.user.id,
    }, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

const getAttendance = async (req, res, next) => {
  try {
    const logs = await trainerService.getAttendanceLogs(req.query.facilityId, {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 50,
    });
    res.json({ attendanceLogs: logs });
  } catch (err) { next(err); }
};

const verifyCard = async (req, res, next) => {
  try {
    const result = await trainerService.verifyCard({
      qrToken: req.body.qrToken,
      scannedById: req.user.id,
    }, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

const lookupCard = async (req, res, next) => {
  try {
    const result = await trainerService.lookupCardByNumber({
      cardNumber: req.body.cardNumber,
      scannedById: req.user.id,
    }, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = { scan, getAttendance, verifyCard, lookupCard };
