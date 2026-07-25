const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

/**
 * Create a multer upload instance for a specific subdirectory.
 * @param {string} subDir - Subdirectory within uploads (e.g., 'bank-slips')
 * @param {string[]} allowedTypes - Allowed MIME types
 */
const createUploader = (subDir, allowedTypes = ALLOWED_DOC_TYPES) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.resolve(env.UPLOAD_DIR, subDir));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${uuidv4()}${ext}`;
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    },
  });
};

const bankSlipUpload = createUploader('bank-slips', ALLOWED_IMAGE_TYPES);
const idProofUpload = createUploader('id-proofs', ALLOWED_DOC_TYPES);
const medicalClearanceUpload = createUploader('medical-clearances', ALLOWED_DOC_TYPES);
const photoUpload = createUploader('photos', ALLOWED_IMAGE_TYPES);

module.exports = {
  bankSlipUpload,
  idProofUpload,
  medicalClearanceUpload,
  photoUpload,
  createUploader,
};
