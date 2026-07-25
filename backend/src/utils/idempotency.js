const { query } = require('../config/database');

/**
 * Check and store an idempotency key to prevent duplicate processing.
 * 
 * @param {string} key - Idempotency key (UUID)
 * @returns {Object|null} Stored response if key already exists, null if new
 */
const checkIdempotencyKey = async (key) => {
  const result = await query(
    `SELECT response FROM idempotency_keys 
     WHERE key = $1 AND expires_at > NOW()`,
    [key]
  );
  
  if (result.rows.length > 0) {
    return result.rows[0].response;
  }
  
  return null;
};

/**
 * Store an idempotency key with its response.
 * Keys expire after 24 hours.
 * 
 * @param {string} key - Idempotency key
 * @param {Object} response - Response to store
 */
const storeIdempotencyKey = async (key, response) => {
  await query(
    `INSERT INTO idempotency_keys (id, key, response, expires_at) 
     VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '24 hours')
     ON CONFLICT (key) DO NOTHING`,
    [key, JSON.stringify(response)]
  );
};

module.exports = { checkIdempotencyKey, storeIdempotencyKey };
