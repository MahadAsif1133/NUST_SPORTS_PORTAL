const { Router } = require('express');
const cardController = require('../controllers/card.controller');
const { authenticate } = require('../middleware/authenticate');

const router = Router();

router.use(authenticate);

router.get('/my', cardController.getMyCards);
router.get('/:id/qr', cardController.getQR);
router.get('/:id/ecard', cardController.getECard);
router.post('/:id/report-lost', cardController.reportLost);

module.exports = router;
