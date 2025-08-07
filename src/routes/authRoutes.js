const express = require('express');
const {
  login,
  createUser,
  accountSetup,
  forgotPassword,
  resetPassword,
  getMe,
  logout
} = require('../controllers/authController');

const {
  validateLogin,
  validateCreateUser,
  validateAccountSetup,
  validateForgotPassword,
  validateResetPassword
} = require('../middleware/validation/userValidation');

const { protect, authorize } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Public routes with rate limiting
router.post('/login', validateLogin, login);
router.post('/account-setup/:token', validateAccountSetup, accountSetup);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.put('/reset-password/:token', validateResetPassword, resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);

// Admin routes
router.post('/users', protect, authorize('admin'), validateCreateUser, createUser);

module.exports = router; 