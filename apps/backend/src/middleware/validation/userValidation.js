const { body, param, validationResult } = require('express-validator');

// Middleware to check for validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Validation rules for creating a user (admin creates initial user)
exports.validateCreateUser = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string')
    .trim(),
  
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isString()
    .withMessage('Last name must be a string')
    .trim(),
  
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .trim(),
  
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be user or admin'),
  
  validateRequest
];

// Validation rules for user account setup
exports.validateAccountSetup = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    
  validateRequest
];

// Validation rules for user login
exports.validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  validateRequest
];

// Validation rules for updating a user
exports.validateUpdateUser = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim(),
  
  body('lastName')
    .optional()
    .isString()
    .withMessage('Last name must be a string')
    .trim(),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  
  body('phoneNumber')
    .optional()
    .trim(),
  
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be user or admin'),
  
  validateRequest
];

// Validation rules for forgot password
exports.validateForgotPassword = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
    
  validateRequest
];

// Validation rules for reset password
exports.validateResetPassword = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    
  validateRequest
];

// Validation rules for change password (authenticated user)
exports.validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('confirmNewPassword')
    .notEmpty()
    .withMessage('Confirm new password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New passwords do not match');
      }
      return true;
    }),
  validateRequest
];

// Validation rules for userId param (e.g. admin reset password)
exports.validateUserIdParam = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  validateRequest
];

// Validation rules for getting a user
exports.validateGetUser = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  validateRequest
];

// Validation rules for deleting a user
exports.validateDeleteUser = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  validateRequest
];

// Validation rules for self account deletion
exports.validateDeleteMyAccount = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('confirmationText')
    .notEmpty()
    .withMessage('Confirmation text is required')
    .custom((value) => {
      if (String(value).trim().toUpperCase() !== 'DELETE') {
        throw new Error('Confirmation text must be DELETE');
      }
      return true;
    }),
  validateRequest
];
