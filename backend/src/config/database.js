const { Pool } = require('pg');
const env = require('./env');

const isProduction = env.NODE_ENV === 'production' || process.env.DB_SSL === 'true';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  process.exit(-1);
});

/**
 * Execute a parameterized query (always use this — never concatenate SQL strings).
 * @param {string} text - SQL query with $1, $2, ... placeholders
 * @param {Array} params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (env.isDev()) {
    console.log('[DB]', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
  }
  return result;
};

/**
 * Get a client from the pool for transactions.
 * ALWAYS release the client in a finally block.
 */
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Monkey-patch to log queries in dev
  client.query = async (...args) => {
    const start = Date.now();
    const result = await originalQuery(...args);
    if (env.isDev()) {
      const text = typeof args[0] === 'string' ? args[0] : args[0]?.text;
      console.log('[DB:TXN]', { text: text?.substring(0, 80), duration: `${Date.now() - start}ms` });
    }
    return result;
  };

  client.release = () => {
    originalRelease();
  };

  return client;
};

/**
 * Execute a function within a database transaction.
 * Automatically handles BEGIN/COMMIT/ROLLBACK.
 * @param {Function} fn - Async function receiving the client
 */
const withTransaction = async (fn) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, getClient, withTransaction };
