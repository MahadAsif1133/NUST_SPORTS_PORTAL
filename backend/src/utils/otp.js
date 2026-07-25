const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a random 6-digit OTP.
 * @returns {string} 6-digit OTP string
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hash an OTP for secure storage.
 * @param {string} otp - Plain text OTP
 * @returns {Promise<string>} Hashed OTP
 */
const hashOTP = async (otp) => {
  return bcrypt.hash(otp, 10);
};

/**
 * Verify an OTP against its hash.
 * @param {string} otp - Plain text OTP
 * @param {string} hash - Stored hash
 * @returns {Promise<boolean>}
 */
const verifyOTP = async (otp, hash) => {
  return bcrypt.compare(otp, hash);
};

/**
 * Mock email OTP sender — logs to console in development.
 * In production, this would send via a real SMTP service.
 * @param {string} email - Recipient email
 * @param {string} otp - OTP to send
 */
const sendOTPEmail = async (email, otp) => {
  // Mock implementation — logs OTP to console
  console.log(`
╔══════════════════════════════════════════════╗
║  [MOCK EMAIL] OTP Verification Code          ║
╠══════════════════════════════════════════════╣
║  To:   ${email.padEnd(38)}║
║  Code: ${otp.padEnd(38)}║
║  Expires in 5 minutes                        ║
╚══════════════════════════════════════════════╝
  `);
  
  return { success: true, messageId: `mock-${Date.now()}` };
};

module.exports = { generateOTP, hashOTP, verifyOTP, sendOTPEmail };
