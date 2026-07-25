const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  QR_TOKEN_EXPIRY_SECONDS: parseInt(process.env.QR_TOKEN_EXPIRY_SECONDS, 10) || 60,
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  STUDENT_DATA_PROVIDER: process.env.STUDENT_DATA_PROVIDER || 'mock',
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'mock',
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  CSRF_SECRET: process.env.CSRF_SECRET,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  LOGIN_RATE_LIMIT_WINDOW_MS: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 900000,
  LOGIN_RATE_LIMIT_MAX: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5,
  OTP_RATE_LIMIT_WINDOW_MS: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS, 10) || 900000,
  OTP_RATE_LIMIT_MAX: parseInt(process.env.OTP_RATE_LIMIT_MAX, 10) || 3,

  isDev() {
    return this.NODE_ENV === 'development';
  },

  isProd() {
    return this.NODE_ENV === 'production';
  },
};

// Validate required env vars
const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
for (const key of required) {
  if (!env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = env;
