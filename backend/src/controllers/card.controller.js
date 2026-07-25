const cardService = require('../services/card.service');

const getMyCards = async (req, res, next) => {
  try {
    const cards = await cardService.getUserCards(req.user.id);
    res.json({ cards });
  } catch (err) { next(err); }
};

const getQR = async (req, res, next) => {
  try {
    const result = await cardService.generateQR(req.params.id, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
};

const getECard = async (req, res, next) => {
  try {
    const { pdfBuffer, filename } = await cardService.getECard(req.params.id, req.user.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

const reportLost = async (req, res, next) => {
  try {
    const result = await cardService.reportLost(req.params.id, req.user.id, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = { getMyCards, getQR, getECard, reportLost };
