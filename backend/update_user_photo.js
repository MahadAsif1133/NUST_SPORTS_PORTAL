const path = require('path');
const fs = require('fs');
const { query, pool } = require('./src/config/database');

const regNumber = process.argv[2];
const photoName = process.argv[3];

if (!regNumber || !photoName) {
  console.log('\nUsage: node update_user_photo.js <registrationNumber> <photo_filename_in_uploads_folder>');
  console.log('Example: node update_user_photo.js 412001 my_pic.jpg\n');
  process.exit(1);
}

// Check if file exists in uploads
const uploadsDir = path.resolve(__dirname, 'uploads');
const photoPath = path.resolve(uploadsDir, photoName);

if (!fs.existsSync(photoPath)) {
  console.error(`\nError: File not found at ${photoPath}`);
  console.error(`Please place your image inside the backend uploads folder: ${uploadsDir}\n`);
  process.exit(1);
}

const photoUrlPath = `/uploads/${photoName}`;

async function run() {
  try {
    // 1. Update mock_students table
    const mockRes = await query(
      'UPDATE mock_students SET photo_url = $1 WHERE registration_number = $2 RETURNING *',
      [photoUrlPath, regNumber]
    );

    // 2. Update users table
    const userRes = await query(
      'UPDATE users SET photo_url = $1 WHERE registration_number = $2 RETURNING *',
      [photoUrlPath, regNumber]
    );

    console.log('\n========================================');
    console.log('✅ Photo updated successfully in database!');
    console.log('========================================');
    console.log(`Registration Number: ${regNumber}`);
    console.log(`Assigned Photo URL:  ${photoUrlPath}`);
    console.log(`Mock Student Record: ${mockRes.rowCount > 0 ? 'Updated' : 'Not found in SSO mock'}`);
    console.log(`User Profile Record: ${userRes.rowCount > 0 ? 'Updated' : 'Not found (needs to register first)'}`);
    console.log('========================================\n');
  } catch (err) {
    console.error('Error updating photo:', err);
  } finally {
    await pool.end();
  }
}

run();
