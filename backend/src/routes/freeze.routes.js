const { Router } = require('express');
const Joi = require('joi');
const freezeController = require('../controllers/freeze.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate({
    body: Joi.object({
      membershipId: Joi.string().uuid().required(),
      freezeStart: Joi.date().iso().required(),
      durationMonths: Joi.number().integer().min(1).max(3).required(),
      reason: Joi.string().allow(null, ''),
    }),
  }),
  freezeController.requestFreeze
);

router.get('/my', freezeController.getMyFreezeRequests);

module.exports = router;
