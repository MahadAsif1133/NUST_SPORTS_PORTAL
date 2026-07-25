const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate an access token for a user.
 * @param {Object} user - User object with id, email, role, fullName
 * @returns {string} JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      registrationNumber: user.registration_number || null,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRY }
  );
};

/**
 * Generate a refresh token for a user.
 * @param {Object} user - User object with id
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  );
};

/**
 * Verify a refresh token.
 * @param {string} token - Refresh token string
 * @returns {Object} Decoded payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

/**
 * Verify an access token (for non-middleware use cases).
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
};
