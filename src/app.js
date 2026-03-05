const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load config
const config = require('./config/config');
const connectDB = require('./config/db');

// Import middleware
const { apiLimiter } = require('./middleware/rateLimit');
const perfLogger = require('./middleware/perfLogger');

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const assetRoutes = require('./routes/assetRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize app
const app = express();

// Basic hardening
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

// Security headers for API responses
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (config.env === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
}

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (config.env !== 'production' && config.cors.allowAllInDevelopment) {
    return true;
  }

  return config.cors.allowedOrigins.includes(origin);
};

// Enable CORS using explicit allowlist in production
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS_NOT_ALLOWED'));
  },
  credentials: true
}));

// Performance logging for API requests
app.use(perfLogger);

// Apply rate limiting to all routes
app.use(apiLimiter);

// Basic health endpoint for uptime checks
app.get('/api/healthz', (req, res) => {
  const isDatabaseConnected = mongoose.connection.readyState === 1;
  const httpStatus = isDatabaseConnected ? 200 : 503;

  res.status(httpStatus).json({
    success: isDatabaseConnected,
    status: isDatabaseConnected ? 'ok' : 'degraded',
    database: isDatabaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Static folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Avoid implicit DB connections in Jest; test setup owns the lifecycle.
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Error handler middleware
app.use((err, req, res, _next) => {
  if (err?.message === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({
      success: false,
      error: 'Origin not allowed by CORS policy'
    });
  }

  console.error(err.stack);
  return res.status(500).json({
    success: false,
    error: 'Server Error'
  });
});

module.exports = app; 
