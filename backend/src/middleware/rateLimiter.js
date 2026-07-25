const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Create a rate limiter with the given window and max requests.
 */
const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'TooManyRequests',
      message: 'Too many requests, please try again later.',
    },
  });
};

/**
 * Strict rate limiter for login endpoints.
 */
const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: `Too many login attempts. Please try again in ${Math.ceil(env.LOGIN_RATE_LIMIT_WINDOW_MS / 60000)} minutes.`,
  },
  keyGenerator: (req) => {
    // Rate limit by IP + attempted email/reg number
    return `${req.ip}:${req.body?.email || req.body?.registrationNumber || 'unknown'}`;
  },
});

/**
 * Strict rate limiter for OTP endpoints.
 */
const otpRateLimiter = rateLimit({
  windowMs: env.OTP_RATE_LIMIT_WINDOW_MS,
  max: env.OTP_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: `Too many OTP requests. Please try again in ${Math.ceil(env.OTP_RATE_LIMIT_WINDOW_MS / 60000)} minutes.`,
  },
});

module.exports = { createRateLimiter, loginRateLimiter, otpRateLimiter };
