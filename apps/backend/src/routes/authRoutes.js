const express = require('express');
const {
  login,
  createUser,
  accountSetup,
  verifyAccountSetupToken,
  forgotPassword,
  verifyResetPasswordToken,
  resetPassword,
  changePassword,
  adminResetUserPassword,
  adminResendAccountSetup,
  getMe,
  logout
} = require('../controllers/authController');
const { deleteMyAccount } = require('../controllers/userController');

const {
  validateLogin,
  validateCreateUser,
  validateAccountSetup,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUserIdParam,
  validateDeleteMyAccount
} = require('../middleware/validation/userValidation');

const { protect, authorize } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Public routes with rate limiting
router.post('/login', authLimiter, validateLogin, login);
router.get('/account-setup/:token/verify', verifyAccountSetupToken);
router.post('/account-setup/:token', validateAccountSetup, accountSetup);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.get('/reset-password/:token/verify', verifyResetPasswordToken);
router.put('/reset-password/:token', validateResetPassword, resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.delete('/me', protect, validateDeleteMyAccount, deleteMyAccount);
router.get('/logout', protect, logout);
router.put('/change-password', protect, validateChangePassword, changePassword);

// Admin routes
router.post('/users', protect, authorize('admin'), validateCreateUser, createUser);
router.post('/users/:userId/reset-password', protect, authorize('admin'), validateUserIdParam, adminResetUserPassword);
router.post('/users/:userId/resend-account-setup', protect, authorize('admin'), validateUserIdParam, adminResendAccountSetup);

module.exports = router;
