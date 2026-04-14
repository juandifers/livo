# Validation Middleware

This folder contains validation middleware for the API routes using express-validator.

## Overview

The validation middleware:
1. Validates request data (body, params, query)
2. Returns appropriate error messages if validation fails
3. Allows requests to proceed to controllers only if validation passes

## Files

- `bookingValidation.js`: Validation for booking-related routes
- `assetValidation.js`: Validation for asset-related routes
- `userValidation.js`: Validation for user-related routes

## How It Works

1. Each route has its own validation middleware that checks specific fields
2. If validation passes, the request proceeds to the controller
3. If validation fails, the request is stopped and an error response is sent

## Example

```javascript
// Route definition with validation
router.post('/bookings', validateCreateBooking, createBooking);

// Validation middleware (from bookingValidation.js)
exports.validateCreateBooking = [
  body('userId').notEmpty().withMessage('User ID is required'),
  // ... more validations
  validateRequest // Final middleware that checks for errors
];
```

## Error Response Format

When validation fails, the response will look like:

```json
{
  "success": false,
  "errors": [
    {
      "value": "",
      "msg": "User ID is required",
      "param": "userId",
      "location": "body"
    }
  ]
}
```

## Validation Types

- `body`: Validates request body data
- `param`: Validates URL parameters
- `query`: Validates query string parameters

## Common Validation Methods

- `notEmpty()`: Ensures a field is not empty
- `isMongoId()`: Ensures a field is a valid MongoDB ID
- `isISO8601()`: Ensures a field is a valid date in ISO format
- `isInt()`: Ensures a field is an integer
- `isFloat()`: Ensures a field is a floating-point number
- `isBoolean()`: Ensures a field is a boolean
- `isIn([...])`: Ensures a field has one of the specified values
- `isLength({ min, max })`: Ensures a field's length is within range
- `custom(fn)`: Custom validation function 