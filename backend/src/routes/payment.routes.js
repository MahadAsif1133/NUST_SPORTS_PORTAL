const { Router } = require('express');
const Joi = require('joi');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { bankSlipUpload } = require('../middleware/upload');
const { PAYMENT_TYPE } = require('../utils/constants');

const router = Router();

// ─── Initiate Gateway Payment ───
router.post(
  '/initiate',
  authenticate,
  validate({
    body: Joi.object({
      membershipId: Joi.string().uuid().required(),
      paymentType: Joi.string().valid(...Object.values(PAYMENT_TYPE)).required(),
    }),
  }),
  paymentController.initiate
);

// ─── Gateway Callback (no auth — called by gateway) ───
router.post('/gateway/callback', paymentController.gatewayCallback);

// ─── Mock Checkout (dev only) ───
router.get('/gateway/mock-checkout', paymentController.mockCheckout);

// ─── Upload Bank Slip ───
router.post(
  '/bank-slip/upload',
  authenticate,
  bankSlipUpload.single('bankSlip'),
  validate({
    body: Joi.object({
      membershipId: Joi.string().uuid().required(),
      paymentType: Joi.string().valid(...Object.values(PAYMENT_TYPE)).required(),
    }),
  }),
  paymentController.uploadBankSlip
);

// ─── My Payments ───
router.get('/my', authenticate, paymentController.getMyPayments);

// ─── Payment Details ───
router.get('/:id', authenticate, paymentController.getById);

module.exports = router;
