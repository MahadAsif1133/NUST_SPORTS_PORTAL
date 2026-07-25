const { Router } = require('express');
const Joi = require('joi');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// ─── Users ───
router.get('/users', adminController.listUsers);
router.patch(
  '/users/:id/verify',
  validate({
    body: Joi.object({
      approved: Joi.boolean().required(),
      reason: Joi.string().allow(null, ''),
    }),
  }),
  adminController.verifyUser
);

// ─── Memberships ───
router.get('/memberships', adminController.listMemberships);

// ─── Child Family Members ───
router.get('/family-members/pending', adminController.getPendingFamilyMembers);
router.patch(
  '/family-members/:id/decide',
  validate({
    body: Joi.object({
      approved: Joi.boolean().required(),
      reason: Joi.string().allow(null, ''),
    }),
  }),
  adminController.decideFamilyMember
);

// ─── Bank Slips ───
router.get('/payments/pending-slips', adminController.getPendingBankSlips);
router.patch(
  '/payments/:id/verify-slip',
  validate({
    body: Joi.object({
      approved: Joi.boolean().required(),
      reason: Joi.string().allow(null, ''),
    }),
  }),
  adminController.verifyBankSlip
);

// ─── Freeze Requests ───
router.get('/freeze-requests', adminController.getPendingFreezeRequests);
router.patch(
  '/freeze-requests/:id',
  validate({
    body: Joi.object({
      approved: Joi.boolean().required(),
      reason: Joi.string().allow(null, ''),
    }),
  }),
  adminController.decideFreezeRequest
);

// ─── Cards ───
router.patch('/cards/:id/ready', adminController.markCardReady);
router.patch('/cards/:id/collected', adminController.markCardCollected);

// ─── Statistics ───
router.get('/stats', adminController.getStats);
router.get('/facility-members', adminController.getFacilityMembers);

module.exports = router;
