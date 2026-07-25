const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { createRateLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth.routes');
const membershipRoutes = require('./routes/membership.routes');
const paymentRoutes = require('./routes/payment.routes');
const cardRoutes = require('./routes/card.routes');
const freezeRoutes = require('./routes/freeze.routes');
const facilityRoutes = require('./routes/facility.routes');
const trainerRoutes = require('./routes/trainer.routes');
const adminRoutes = require('./routes/admin.routes');
const auditRoutes = require('./routes/audit.routes');
const chatbotRoutes = require('./routes/chatbot.routes');

const app = express();

// ─── Security Headers ───
app.use(helmet());

// ─── CORS ───
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, etc.)
    if (!origin) return callback(null, true);
    // In development allow any localhost port or local network IP
    if (process.env.NODE_ENV !== 'production' && (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin))) {
      return callback(null, true);
    }
    // In production, only allow the configured frontend URL
    if (origin === env.FRONTEND_URL) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Idempotency-Key'],
}));

// ─── Body Parsers ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Global Rate Limiter ───
app.use(createRateLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX_REQUESTS));

// ─── Static Files (uploaded content) ───
const fs = require('fs');
const uploadDirResolved = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDirResolved)) {
  fs.mkdirSync(uploadDirResolved, { recursive: true });
}
app.use('/uploads', express.static(uploadDirResolved));

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── API Routes ───
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/memberships', membershipRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/cards', cardRoutes);
app.use('/api/v1/freeze', freezeRoutes);
app.use('/api/v1/facilities', facilityRoutes);
app.use('/api/v1/trainer', trainerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ───
app.use(errorHandler);

module.exports = app;
