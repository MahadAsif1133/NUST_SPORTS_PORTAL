const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate a signed QR token for a membership card.
 * Uses the card's unique signing secret (HMAC) for per-card isolation.
 * 
 * @param {Object} params
 * @param {string} params.cardId - Card UUID
 * @param {string} params.membershipId - Membership UUID
 * @param {string} params.userId - User UUID
 * @param {string} params.signingSecret - Per-card HMAC secret
 * @returns {string} Signed JWT token
 */
const generateQRToken = ({ cardId, membershipId, userId, signingSecret }) => {
  const payload = {
    cid: cardId,
    mid: membershipId,
    uid: userId,
    type: 'qr_checkin',
  };
  const token = jwt.sign(
    payload,
    signingSecret
  );
  console.log('[QR DEBUG] Generated Token Payload:', payload);
  return token;
};

/**
 * Verify a QR token using the card's signing secret.
 * 
 * @param {string} token - QR token to verify
 * @param {string} signingSecret - Per-card HMAC secret
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyQRToken = (token, signingSecret) => {
  try {
    const verified = jwt.verify(token, signingSecret);
    console.log('[QR DEBUG] Verified Token Payload successfully:', verified);
    return verified;
  } catch (err) {
    console.warn('[QR DEBUG] Token verification failed:', err.message);
    return null;
  }
};

/**
 * Generate a random signing secret for a new card.
 * @returns {string} 64-character hex string
 */
const generateSigningSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = { generateQRToken, verifyQRToken, generateSigningSecret };
