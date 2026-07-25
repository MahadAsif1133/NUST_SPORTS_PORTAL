const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MIGRATIONS_DIR = path.join(__dirname, 'db', 'migrations');
const SEEDS_DIR = path.join(__dirname, 'db', 'seeds');

async function runSQLFiles(dir, label) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\n[${label}] Found ${files.length} files in ${dir}`);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      await pool.query(sql);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
      throw err;
    }
  }
}

async function dropAll() {
  console.log('\n[DROP] Dropping all tables and types...');
  await pool.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
  `);
  console.log('  ✓ Schema reset complete');
}

async function createUploadDirs() {
  const uploadBase = path.resolve(process.env.UPLOAD_DIR || './uploads');
  const dirs = ['bank-slips', 'id-proofs', 'medical-clearances', 'photos', 'ecards'];
  
  for (const dir of dirs) {
    const fullPath = path.join(uploadBase, dir);
    fs.mkdirSync(fullPath, { recursive: true });
    
    // Create .gitkeep
    const gitkeep = path.join(fullPath, '.gitkeep');
    if (!fs.existsSync(gitkeep)) {
      fs.writeFileSync(gitkeep, '');
    }
  }
  console.log('\n[UPLOADS] Created upload directories');
}

async function main() {
  const args = process.argv.slice(2);
  const isFresh = args.includes('--fresh');
  const isSeed = args.includes('--seed');

  try {
    console.log('═══════════════════════════════════════');
    console.log('  NUST Sports Portal — Database Setup  ');
    console.log('═══════════════════════════════════════');

    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log(`\n[DB] Connected at ${result.rows[0].now}`);

    if (isFresh) {
      await dropAll();
    }

    // Run migrations
    await runSQLFiles(MIGRATIONS_DIR, 'MIGRATIONS');

    // Create upload directories
    await createUploadDirs();

    // Run seeds if requested or if fresh
    if (isSeed || isFresh) {
      await runSQLFiles(SEEDS_DIR, 'SEEDS');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('  Database setup complete!              ');
    console.log('═══════════════════════════════════════\n');
  } catch (err) {
    console.error('\n[FATAL] Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
