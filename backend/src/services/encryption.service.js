const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex-encoded).
 * 
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Encrypted string in iv:authTag:ciphertext format
 */
const encrypt = (plaintext) => {
  if (!plaintext) return null;
  
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt an encrypted string.
 * 
 * @param {string} encryptedText - Encrypted string in iv:authTag:ciphertext format
 * @returns {string} Decrypted plaintext
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const [ivHex, authTagHex, ciphertext] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

module.exports = { encrypt, decrypt };
