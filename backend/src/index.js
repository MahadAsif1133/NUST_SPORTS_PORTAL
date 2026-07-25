// Server entry point - NUST Sports Portal
const env = require('./config/env');
const app = require('./app');
const { pool } = require('./config/database');
const { startScheduledJobs } = require('./jobs/scheduler');

const PORT = env.PORT;

async function start() {
  // Verify database connection
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(`[DB] Connected to PostgreSQL at ${new Date(result.rows[0].now).toISOString()}`);
  } catch (err) {
    console.error('[DB] Failed to connect to PostgreSQL:', err.message);
    console.error('    Make sure PostgreSQL is running and DATABASE_URL is correct.');
    process.exit(1);
  }

  // Start scheduled jobs
  startScheduledJobs();

  // Start server
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║           NUST Sports Portal — API Server             ║
╠═══════════════════════════════════════════════════════╣
║  Environment: ${env.NODE_ENV.padEnd(39)}║
║  Port:        ${String(PORT).padEnd(39)}║
║  Frontend:    ${env.FRONTEND_URL.padEnd(39)}║
║  Providers:                                           ║
║    Student:   ${env.STUDENT_DATA_PROVIDER.padEnd(39)}║
║    Payment:   ${env.PAYMENT_PROVIDER.padEnd(39)}║
║    Storage:   ${env.STORAGE_PROVIDER.padEnd(39)}║
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

start().catch((err) => {
  console.error('[SERVER] Fatal error during startup:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[SERVER] SIGINT received, shutting down...');
  await pool.end();
  process.exit(0);
});
