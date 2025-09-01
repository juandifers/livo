const { body, param, query, validationResult } = require('express-validator');

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

// Validation rules for creating a booking
exports.validateCreateBooking = [
  // Optional override for admin to create on behalf of a user
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format for admin override'),
  body('assetId')
    .notEmpty()
    .withMessage('Asset ID is required')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date in format YYYY-MM-DD'),
  
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date in format YYYY-MM-DD')
    .custom((endDate, { req }) => {
      const startDate = new Date(req.body.startDate);
      const end = new Date(endDate);
      
      if (end <= startDate) {
        throw new Error('End date must be after start date');
      }
      
      return true;
    }),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .trim(),
  
  body('useExtraDays')
    .optional()
    .isBoolean()
    .withMessage('useExtraDays must be a boolean value'),
  
  validateRequest
];

// Validation rules for updating a booking
exports.validateUpdateBooking = [
  param('id')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date in format YYYY-MM-DD'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date in format YYYY-MM-DD')
    .custom((endDate, { req }) => {
      if (!req.body.startDate && !endDate) return true;
      
      const startDate = req.body.startDate 
        ? new Date(req.body.startDate)
        : null;
      const end = new Date(endDate);
      
      if (startDate && end <= startDate) {
        throw new Error('End date must be after start date');
      }
      
      return true;
    }),
  
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled'])
    .withMessage('Status must be pending, confirmed, or cancelled'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .trim(),
  
  validateRequest
];

// Validation rules for getting a booking
exports.validateGetBooking = [
  param('id')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
    
  validateRequest
];

// Validation rules for deleting a booking
exports.validateDeleteBooking = [
  param('id')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
    
  validateRequest
];

// Validation rules for getting bookings
exports.validateGetBookings = [
  query('user')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  query('asset')
    .optional()
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled'])
    .withMessage('Status must be pending, confirmed, or cancelled'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date in format YYYY-MM-DD'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date in format YYYY-MM-DD'),
    
  validateRequest
];

// Validation rules for getting availability
exports.validateGetAvailability = [
  param('assetId')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date in format YYYY-MM-DD'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date in format YYYY-MM-DD'),
    
  validateRequest
];

// Validation rules for getting user allocation
exports.validateGetUserAllocation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  param('assetId')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
    
  validateRequest
];

// Validation rules for creating special dates (assetId optional for universal dates)
exports.validateCreateSpecialDates = [
  body('assetId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  body('dates')
    .isArray({ min: 1 })
    .withMessage('At least one special date must be provided'),
  
  body('dates.*.type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['type1', 'type2'])
    .withMessage('Type must be type1 or type2'),
  
  body('dates.*.name')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string')
    .trim(),
  
  body('dates.*.startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date in format YYYY-MM-DD'),
  
  body('dates.*.endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date in format YYYY-MM-DD'),
  
  body('dates.*.year')
    .notEmpty()
    .withMessage('Year is required')
    .isInt({ min: new Date().getFullYear(), max: new Date().getFullYear() + 5 })
    .withMessage(`Year must be between ${new Date().getFullYear()} and ${new Date().getFullYear() + 5}`),
  
  validateRequest
];

// Validation rules for getting special dates
exports.validateGetSpecialDates = [
  param('assetId')
    .isMongoId()
    .withMessage('Invalid asset ID format'),
  
  query('year')
    .optional()
    .isInt()
    .withMessage('Year must be a valid number'),
    
  validateRequest
];

// Validation rules for deleting a special date
exports.validateDeleteSpecialDate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid special date ID format'),
    
  validateRequest
];

// Validation rules for processing extra days payment
exports.validateProcessPayment = [
  param('id')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
  
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isString()
    .withMessage('Payment method must be a string'),
  
  body('paymentDetails')
    .notEmpty()
    .withMessage('Payment details are required')
    .isObject()
    .withMessage('Payment details must be an object'),
    
  validateRequest
]; 