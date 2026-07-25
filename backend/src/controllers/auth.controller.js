const authService = require('../services/auth.service');

/**
 * POST /api/v1/auth/register/student
 */
const registerStudent = async (req, res, next) => {
  try {
    const { registrationNumber, password } = req.body;
    const result = await authService.registerStudent(registrationNumber, password, req.ip);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/register/native
 */
const registerNative = async (req, res, next) => {
  try {
    const result = await authService.registerNative(req.body, req.ip);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.user.id, refreshToken);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/verify-otp
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    const result = await authService.verifyEmailOTP(userId, otp);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/resend-otp
 */
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.resendOTP(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerStudent,
  registerNative,
  login,
  refresh,
  logout,
  verifyOTP,
  resendOTP,
  getMe,
};
