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

// Validation rules for creating an asset
exports.validateCreateAsset = [
  body('name')
    .notEmpty()
    .withMessage('Asset name is required')
    .isString()
    .withMessage('Asset name must be a string')
    .trim(),
  
  body('type')
    .notEmpty()
    .withMessage('Asset type is required')
    .isIn(['boat', 'home'])
    .withMessage('Asset type must be boat or home'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim(),
  
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .isString()
    .withMessage('Location must be a string')
    .trim(),
  
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive number'),
  
  body('photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array'),
  
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  
  validateRequest
];

// Validation rules for updating an asset
exports.validateUpdateAsset = [
  param('id')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  body('name')
    .optional()
    .isString()
    .withMessage('Asset name must be a string')
    .trim(),
  
  body('type')
    .optional()
    .isIn(['boat', 'home'])
    .withMessage('Asset type must be boat or home'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim(),
  
  body('location')
    .optional()
    .isString()
    .withMessage('Location must be a string')
    .trim(),
  
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive number'),
  
  body('photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array'),
  
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  
  validateRequest
];

// Validation rules for getting an asset
exports.validateGetAsset = [
  param('id')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  validateRequest
];

// Validation rules for deleting an asset
exports.validateDeleteAsset = [
  param('id')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  validateRequest
];

// Validation rules for adding an owner to an asset
exports.validateAddOwner = [
  param('id')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('sharePercentage')
    .notEmpty()
    .withMessage('Share percentage is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Share percentage must be between 0 and 100'),
  
  validateRequest
];

// Validation rules for removing an owner from an asset
exports.validateRemoveOwner = [
  param('id')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  validateRequest
];

// Validation rules for updating owners (bulk update)
exports.validateUpdateOwners = [
  param('id')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  body('owners')
    .isArray({ min: 1 })
    .withMessage('Owners must be a non-empty array'),
  
  body('owners.*.userId')
    .notEmpty()
    .withMessage('Each owner must have a userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('owners.*.sharePercentage')
    .notEmpty()
    .withMessage('Each owner must have a sharePercentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Share percentage must be between 0 and 100'),
  
  validateRequest
]; 