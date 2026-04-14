const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

const LAST_LOGIN_UPDATE_WINDOW_MS =
  parseInt(process.env.LAST_LOGIN_UPDATE_WINDOW_MS, 10) || 15 * 60 * 1000;

const maybeUpdateLastLogin = (user) => {
  const now = Date.now();
  const previous = user?.lastLogin ? new Date(user.lastLogin).getTime() : 0;

  // Avoid a write on every request. Update infrequently and do it async.
  if (previous && now - previous < LAST_LOGIN_UPDATE_WINDOW_MS) {
    return;
  }

  const threshold = new Date(now - LAST_LOGIN_UPDATE_WINDOW_MS);
  User.updateOne(
    {
      _id: user._id,
      $or: [
        { lastLogin: { $exists: false } },
        { lastLogin: null },
        { lastLogin: { $lt: threshold } }
      ]
    },
    { $set: { lastLogin: new Date(now) } }
  ).catch((err) => {
    console.warn(`Failed to update lastLogin for user ${user?._id}: ${err.message}`);
  });
};

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

    maybeUpdateLastLogin(req.user);

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
