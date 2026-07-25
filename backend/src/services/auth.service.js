const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateOTP, hashOTP, verifyOTP, sendOTPEmail } = require('../utils/otp');
const { encrypt } = require('./encryption.service');
const { logAudit } = require('./audit.service');
const { ROLES, NATIVE_AUTH_ROLES, VERIFICATION_REQUIRED_ROLES, AUDIT_ACTIONS } = require('../utils/constants');
const { AppError } = require('../middleware/errorHandler');
const env = require('../config/env');

// Lazy-loaded student data provider
let studentProvider = null;
const getStudentProvider = () => {
  if (!studentProvider) {
    if (env.STUDENT_DATA_PROVIDER === 'mock') {
      const MockQalamProvider = require('../providers/student-data/MockQalamProvider');
      studentProvider = new MockQalamProvider();
    } else {
      const RealQalamProvider = require('../providers/student-data/RealQalamProvider');
      studentProvider = new RealQalamProvider();
    }
  }
  return studentProvider;
};

/**
 * Register a student via SSO (Qalam) provider.
 * Auto-verified since the SSO is the source of truth.
 */
const registerStudent = async (registrationNumber, password, ipAddress) => {
  const provider = getStudentProvider();
  const studentData = await provider.authenticate(registrationNumber, password);

  if (!studentData) {
    throw new AppError(401, 'AuthFailed', 'Invalid registration number or password');
  }

  // Check if student already registered
  const existing = await query(
    'SELECT id FROM users WHERE registration_number = $1',
    [registrationNumber]
  );

  if (existing.rows.length > 0) {
    throw new AppError(409, 'AlreadyRegistered', 'This student is already registered');
  }

  return await withTransaction(async (client) => {
    // Create user from SSO data — auto-verified
    const result = await client.query(
      `INSERT INTO users (id, email, role, is_verified, is_active, full_name, cnic_encrypted, dob, 
       contact_number, photo_url, department, degree_program, registration_number, created_at, updated_at)
       VALUES (gen_random_uuid(), NULL, $1, true, true, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        ROLES.STUDENT,
        studentData.fullName,
        encrypt(studentData.cnic),
        studentData.dob,
        studentData.contactNumber,
        studentData.photoUrl,
        studentData.department,
        studentData.degreeProgram,
        studentData.registrationNumber,
      ]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await client.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '7 days', NOW())`,
      [user.id, refreshHash]
    );

    // Audit
    await logAudit({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      actorId: user.id,
      targetType: 'USER',
      targetId: user.id,
      details: { role: ROLES.STUDENT, registrationNumber },
      ipAddress,
      client,
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  });
};

/**
 * Register a native user (Faculty, Alumni, Tenants, etc.) with email/password.
 * Requires OTP verification, then admin approval for certain roles.
 */
const registerNative = async ({ email, password, role, fullName, cnic, dob, contactNumber, department, verificationDocPath }, ipAddress) => {
  if (!NATIVE_AUTH_ROLES.includes(role)) {
    throw new AppError(400, 'InvalidRole', `Role ${role} cannot register with email/password`);
  }

  // Check existing
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError(409, 'AlreadyRegistered', 'This email is already registered');
  }

  return await withTransaction(async (client) => {
    const passwordHash = await bcrypt.hash(password, 12);
    const needsVerification = VERIFICATION_REQUIRED_ROLES.includes(role);

    const result = await client.query(
      `INSERT INTO users (id, email, password_hash, role, is_verified, is_active, full_name, 
       cnic_encrypted, dob, contact_number, department, verification_doc_path, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        email, passwordHash, role,
        !needsVerification, // Admin/Trainer auto-verified, others need approval
        fullName, encrypt(cnic), dob, contactNumber, department, verificationDocPath,
      ]
    );

    const user = result.rows[0];

    // Generate and send OTP for email verification
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await client.query(
      `INSERT INTO otp_tokens (id, user_id, otp_hash, purpose, expires_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'EMAIL_VERIFICATION', NOW() + INTERVAL '${env.OTP_EXPIRY_MINUTES} minutes', NOW())`,
      [user.id, otpHash]
    );
    await sendOTPEmail(email, otp);

    // Audit
    await logAudit({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      actorId: user.id,
      targetType: 'USER',
      targetId: user.id,
      details: { role, needsVerification },
      ipAddress,
      client,
    });

    return {
      user: sanitizeUser(user),
      message: needsVerification
        ? 'Registration successful. Please verify your email with the OTP sent. After that, an admin must approve your account.'
        : 'Registration successful. Please verify your email with the OTP sent.',
    };
  });
};

/**
 * Verify email OTP.
 */
const verifyEmailOTP = async (userId, otp) => {
  const result = await query(
    `SELECT * FROM otp_tokens 
     WHERE user_id = $1 AND purpose = 'EMAIL_VERIFICATION' AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError(400, 'OTPExpired', 'No valid OTP found. Please request a new one.');
  }

  const otpRecord = result.rows[0];
  const isValid = await verifyOTP(otp, otpRecord.otp_hash);

  if (!isValid) {
    throw new AppError(400, 'InvalidOTP', 'The OTP code is incorrect');
  }

  // Mark OTP as used
  await query('UPDATE otp_tokens SET used = true WHERE id = $1', [otpRecord.id]);

  return { success: true, message: 'Email verified successfully' };
};

/**
 * Resend OTP for email verification.
 */
const resendOTP = async (email) => {
  const userResult = await query('SELECT id, email FROM users WHERE email = $1', [email]);
  if (userResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'No account found with this email');
  }

  const user = userResult.rows[0];

  // Invalidate existing OTPs
  await query(
    `UPDATE otp_tokens SET used = true WHERE user_id = $1 AND purpose = 'EMAIL_VERIFICATION' AND used = false`,
    [user.id]
  );

  // Generate new OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  await query(
    `INSERT INTO otp_tokens (id, user_id, otp_hash, purpose, expires_at, created_at)
     VALUES (gen_random_uuid(), $1, $2, 'EMAIL_VERIFICATION', NOW() + INTERVAL '${env.OTP_EXPIRY_MINUTES} minutes', NOW())`,
    [user.id, otpHash]
  );
  await sendOTPEmail(user.email, otp);

  return { success: true, message: 'A new OTP has been sent to your email' };
};

/**
 * Login with email/password or registration number.
 */
const login = async (credentials, ipAddress) => {
  const { email, registrationNumber, password } = credentials;
  let user;

  if (registrationNumber) {
    // Student login via SSO
    const provider = getStudentProvider();
    const studentData = await provider.authenticate(registrationNumber, password);
    if (!studentData) {
      throw new AppError(401, 'AuthFailed', 'Invalid registration number or password');
    }

    const result = await query(
      'SELECT * FROM users WHERE registration_number = $1',
      [registrationNumber]
    );
    if (result.rows.length === 0) {
      throw new AppError(401, 'NotRegistered', 'Please register first before logging in');
    }
    user = result.rows[0];
  } else if (email) {
    // Native login
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      throw new AppError(401, 'AuthFailed', 'Invalid email or password');
    }
    user = result.rows[0];

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      throw new AppError(401, 'AuthFailed', 'Invalid email or password');
    }
  } else {
    throw new AppError(400, 'BadRequest', 'Provide email or registration number');
  }

  // Check account status
  if (!user.is_active) {
    throw new AppError(403, 'AccountDisabled', 'Your account has been disabled');
  }
  if (!user.is_verified && VERIFICATION_REQUIRED_ROLES.includes(user.role)) {
    throw new AppError(403, 'PendingVerification', 'Your account is pending admin verification');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store refresh token
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '7 days', NOW())`,
    [user.id, refreshHash]
  );

  // Audit
  await logAudit({
    action: AUDIT_ACTIONS.USER_LOGIN,
    actorId: user.id,
    targetType: 'USER',
    targetId: user.id,
    details: { method: registrationNumber ? 'SSO' : 'EMAIL' },
    ipAddress,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

/**
 * Refresh access token using a refresh token.
 */
const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'InvalidToken', 'Invalid or expired refresh token');
  }

  // Find the stored refresh token
  const tokens = await query(
    `SELECT * FROM refresh_tokens WHERE user_id = $1 AND revoked = false AND expires_at > NOW()`,
    [decoded.id]
  );

  // Verify the token hash matches one of the stored tokens
  let tokenRecord = null;
  for (const t of tokens.rows) {
    const matches = await bcrypt.compare(refreshToken, t.token_hash);
    if (matches) {
      tokenRecord = t;
      break;
    }
  }

  if (!tokenRecord) {
    throw new AppError(401, 'InvalidToken', 'Refresh token has been revoked or expired');
  }

  // Get fresh user data
  const userResult = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
  if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
    throw new AppError(401, 'InvalidToken', 'User account is no longer valid');
  }

  const user = userResult.rows[0];
  const newAccessToken = generateAccessToken(user);

  return {
    accessToken: newAccessToken,
    user: sanitizeUser(user),
  };
};

/**
 * Logout — revoke refresh token.
 */
const logout = async (userId, refreshToken) => {
  if (refreshToken) {
    const tokens = await query(
      `SELECT * FROM refresh_tokens WHERE user_id = $1 AND revoked = false`,
      [userId]
    );
    for (const t of tokens.rows) {
      const matches = await bcrypt.compare(refreshToken, t.token_hash);
      if (matches) {
        await query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [t.id]);
        break;
      }
    }
  }
  return { success: true };
};

/**
 * Get the current user's profile.
 */
const getProfile = async (userId) => {
  const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'User not found');
  }
  return sanitizeUser(result.rows[0]);
};

/**
 * Strip sensitive fields from a user object.
 */
const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  isVerified: user.is_verified,
  isActive: user.is_active,
  isForeigner: user.is_foreigner,
  fullName: user.full_name,
  dob: user.dob,
  contactNumber: user.contact_number,
  photoUrl: user.photo_url,
  department: user.department,
  degreeProgram: user.degree_program,
  registrationNumber: user.registration_number,
  createdAt: user.created_at,
});

module.exports = {
  registerStudent,
  registerNative,
  verifyEmailOTP,
  resendOTP,
  login,
  refreshAccessToken,
  logout,
  getProfile,
};
