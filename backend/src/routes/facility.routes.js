const { Router } = require('express');
const facilityController = require('../controllers/facility.controller');

const router = Router();

// Public endpoints — no authentication required
router.get('/', facilityController.listFacilities);
router.get('/rates', facilityController.getAllRates);
router.get('/:id/rates', facilityController.getRates);
router.get('/:id/schedule', facilityController.getSchedule);

module.exports = router;
