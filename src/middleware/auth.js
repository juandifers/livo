const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

/**
 * Protect routes - Middleware to check if user is authenticated
 */
exports.protect = async (req, res, next) => {
  let token;

  // Get token from Authorization header or cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    // Get token from cookie
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this resource'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Set user in req object
    req.user = await User.findById(decoded.id);

    // Check if user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user account is active
    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is not active. Please complete the account setup.'
      });
    }

    // Update last login time
    req.user.lastLogin = Date.now();
    await req.user.save({ validateBeforeSave: false });

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this resource'
    });
  }
};

/**
 * Authorize roles - Middleware to check if user has required role
 * @param  {...string} roles - List of allowed roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
}; 