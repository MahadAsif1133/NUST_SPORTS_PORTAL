const { Router } = require('express');
const Joi = require('joi');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { loginRateLimiter, otpRateLimiter } = require('../middleware/rateLimiter');
const { NATIVE_AUTH_ROLES } = require('../utils/constants');

const router = Router();

// ─── Student Registration (via SSO) ───
router.post(
  '/register/student',
  validate({
    body: Joi.object({
      registrationNumber: Joi.string().required().trim(),
      password: Joi.string().required(),
    }),
  }),
  authController.registerStudent
);

// ─── Native Registration (Email/Password) ───
router.post(
  '/register/native',
  validate({
    body: Joi.object({
      email: Joi.string().email().required().trim().lowercase(),
      password: Joi.string().min(8).required(),
      role: Joi.string().valid(...NATIVE_AUTH_ROLES).required(),
      fullName: Joi.string().required().trim(),
      cnic: Joi.string().allow(null, ''),
      dob: Joi.date().iso().allow(null),
      contactNumber: Joi.string().allow(null, ''),
      department: Joi.string().allow(null, ''),
      verificationDocPath: Joi.string().allow(null, ''),
    }),
  }),
  authController.registerNative
);

// ─── Login ───
router.post(
  '/login',
  loginRateLimiter,
  validate({
    body: Joi.object({
      email: Joi.string().email().trim().lowercase(),
      registrationNumber: Joi.string().trim(),
      password: Joi.string().required(),
    }).or('email', 'registrationNumber'),
  }),
  authController.login
);

// ─── Refresh Token ───
router.post(
  '/refresh',
  validate({
    body: Joi.object({
      refreshToken: Joi.string().required(),
    }),
  }),
  authController.refresh
);

// ─── Logout ───
router.post(
  '/logout',
  authenticate,
  validate({
    body: Joi.object({
      refreshToken: Joi.string().allow(null, ''),
    }),
  }),
  authController.logout
);

// ─── Verify OTP ───
router.post(
  '/verify-otp',
  otpRateLimiter,
  validate({
    body: Joi.object({
      userId: Joi.string().uuid().required(),
      otp: Joi.string().length(6).required(),
    }),
  }),
  authController.verifyOTP
);

// ─── Resend OTP ───
router.post(
  '/resend-otp',
  otpRateLimiter,
  validate({
    body: Joi.object({
      email: Joi.string().email().required().trim().lowercase(),
    }),
  }),
  authController.resendOTP
);

// ─── Get Current User ───
router.get('/me', authenticate, authController.getMe);

module.exports = router;
