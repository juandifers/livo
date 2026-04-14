const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Basic rate limiter for general API endpoints
exports.apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // From config
  max: config.rateLimit.maxRequests, // From config
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: `Too many requests from this IP, please try again after ${Math.ceil(config.rateLimit.windowMs / (60 * 1000))} minutes`
  }
});

// Stricter rate limiter for authentication-related endpoints
exports.authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs, // From config
  max: config.rateLimit.authMaxRequests, // From config
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `Too many login attempts. Please try again after ${Math.ceil(config.rateLimit.authWindowMs / (60 * 1000))} minutes`
  }
});

// Rate limiter for password reset requests
exports.passwordResetLimiter = rateLimit({
  windowMs: config.rateLimit.passwordResetWindowMs, // From config
  max: config.rateLimit.passwordResetMaxRequests, // From config
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `Too many password reset requests. Please try again after ${Math.ceil(config.rateLimit.passwordResetWindowMs / (60 * 1000))} minutes`
  }
}); 