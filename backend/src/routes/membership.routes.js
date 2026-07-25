const { Router } = require('express');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const membershipController = require('../controllers/membership.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const env = require('../config/env');

const router = Router();

// Configure file upload middleware for family member photo & medical clearance
const familyUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const subDir = file.fieldname === 'photo' ? 'photos' : 'medical-clearances';
      cb(null, path.resolve(env.UPLOAD_DIR, subDir));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'medicalClearance', maxCount: 1 },
]);

// All routes require authentication
router.use(authenticate);

// ─── Apply for Membership ───
router.post(
  '/',
  validate({
    body: Joi.object({
      categoryCode: Joi.string().required().trim(),
      notes: Joi.string().allow(null, ''),
    }),
  }),
  membershipController.apply
);

// ─── Subscriptions ───
router.post(
  '/subscriptions/calculate',
  validate({
    body: Joi.object({
      selectedFacilities: Joi.array().items(Joi.string().valid('GYM', 'SWIMMING', 'SADDLE')).required(),
    }),
  }),
  membershipController.calculateFee
);

router.post(
  '/:id/subscriptions',
  validate({
    body: Joi.object({
      selectedFacilities: Joi.array().items(Joi.string().valid('GYM', 'SWIMMING', 'SADDLE')).required(),
    }),
  }),
  membershipController.updateSubscriptions
);

// ─── Family Members (Children) Routes ───
router.get('/family-members', membershipController.getFamilyMembers);

router.post(
  '/family-members',
  familyUpload,
  membershipController.addFamilyMember
);

// Support legacy endpoint /:id/family-members
router.post(
  '/:id/family-members',
  familyUpload,
  membershipController.addFamilyMember
);

router.put(
  '/family-members/:id/resubmit',
  familyUpload,
  membershipController.resubmitFamilyMember
);

router.post(
  '/family-members/:id/subscriptions',
  validate({
    body: Joi.object({
      selectedFacilities: Joi.array().items(Joi.string().valid('GYM', 'SWIMMING', 'SADDLE')).required(),
    }),
  }),
  membershipController.updateChildSubscriptions
);

router.delete('/family-members/:id', membershipController.removeFamilyMember);

// ─── My Memberships ───
router.get('/my', membershipController.getMyMemberships);

// ─── Get Membership by ID ───
router.get('/:id', membershipController.getById);

// ─── Cancel Membership ───
router.post(
  '/:id/cancel',
  validate({
    body: Joi.object({
      reason: Joi.string().allow(null, ''),
    }),
  }),
  membershipController.cancel
);

module.exports = router;
