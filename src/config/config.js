require('dotenv').config();

module.exports = {
  // Server settings
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  // MongoDB settings
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/assetBookingSystem',
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'yourSecretKey',
    expiresIn: process.env.JWT_EXPIRE || '30d',
    cookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE) || 30
  },
  
  // Rate limiting settings
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Limit each IP to 100 requests per windowMs
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW) || 60 * 60 * 1000, // 1 hour
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // Limit each IP to 5 login attempts per hour
    passwordResetWindowMs: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW) || 60 * 60 * 1000, // 1 hour
    passwordResetMaxRequests: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX) || 3 // Limit each IP to 3 password reset requests per hour
  },
  
  // Email configuration
  email: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
    from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
    fromName: process.env.FROM_NAME || 'Asset Booking System'
  },
  
  // Base URL for links in emails
  baseUrl: process.env.BASE_URL || 'http://localhost:3000'
}; 