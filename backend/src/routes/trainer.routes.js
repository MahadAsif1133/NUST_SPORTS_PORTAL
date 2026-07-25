const { Router } = require('express');
const Joi = require('joi');
const trainerController = require('../controllers/trainer.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);
router.use(authorize('TRAINER', 'ADMIN'));

router.post(
  '/scan',
  validate({
    body: Joi.object({
      qrToken: Joi.string().required(),
      facilityId: Joi.string().uuid().required(),
    }),
  }),
  trainerController.scan
);

router.post(
  '/verify-card',
  validate({
    body: Joi.object({
      qrToken: Joi.string().required(),
    }),
  }),
  trainerController.verifyCard
);

router.post(
  '/lookup-card',
  validate({
    body: Joi.object({
      cardNumber: Joi.string().trim().min(1).required(),
    }),
  }),
  trainerController.lookupCard
);

router.get('/attendance', trainerController.getAttendance);

module.exports = router;
