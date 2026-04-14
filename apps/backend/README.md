# Asset Booking System - Authentication System

This document describes the authentication system for the Asset Booking System.

## Overview

The authentication system provides:

1. JWT-based authentication
2. Role-based access control (admin and user roles)
3. Email-based account setup for new users
4. Password reset functionality
5. Admin-only user creation
6. Rate limiting for API protection

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create an initial admin user:
   ```
   npm run seed
   ```
   This creates an admin user with:
   - Email: admin@example.com
   - Password: admin123

3. Configure environment variables (optional):
   Create a `.env` file with the following variables:
   ```
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/assetBookingSystem
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USERNAME=your_email@example.com
   SMTP_PASSWORD=your_email_password
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME=Asset Booking System
   
   BASE_URL=http://localhost:3000
   ACCOUNT_SETUP_URL_BASE=http://localhost:3000/account-setup.html
   PASSWORD_RESET_URL_BASE=http://localhost:3000/reset-password.html
   EMAIL_STRICT_TRANSPORT=true
   ALLOW_EMAIL_MOCK_FALLBACK=false
   
   # Rate limiting
   RATE_LIMIT_WINDOW=900000
   RATE_LIMIT_MAX=100
   AUTH_RATE_LIMIT_WINDOW=3600000
   AUTH_RATE_LIMIT_MAX=5
   PASSWORD_RESET_RATE_LIMIT_WINDOW=3600000
   PASSWORD_RESET_RATE_LIMIT_MAX=3
   ```

4. Start the server:
   ```
   npm start
   ```
   Or for development:
   ```
   npm run dev
   ```

## User Management Flow

1. **Admin creates user account**:
   - Admin logs in and creates a new user with name, lastName, email, and phone number
   - User receives an email with account setup link

2. **User completes account setup**:
   - User clicks the link in the email
   - User sets their password
   - Account is activated and user can log in

3. **Password reset**:
   - User requests password reset by providing their email
   - User receives email with password reset link
   - User sets a new password

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/users` - Create a new user (admin only)
- `POST /api/auth/account-setup/:token` - Complete account setup
- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/me` - Get current user
- `GET /api/auth/logout` - Logout

### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Assets

- `GET /api/assets` - Get all assets
- `GET /api/assets/:id` - Get asset by ID
- `POST /api/assets` - Create asset (admin only)
- `PUT /api/assets/:id` - Update asset (admin only)
- `DELETE /api/assets/:id` - Delete asset (admin only)
- `POST /api/assets/:id/owners` - Add owner to asset (admin only)
- `DELETE /api/assets/:id/owners/:userId` - Remove owner from asset (admin only)

### Bookings

- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create a booking
- `PUT /api/bookings/:id` - Update a booking
- `DELETE /api/bookings/:id` - Cancel a booking
- `GET /api/bookings/availability/:assetId` - Get availability calendar
- `GET /api/bookings/allocation/:userId/:assetId` - Get user allocation
- `GET /api/bookings/special-dates/:assetId` - Get special dates
- `POST /api/bookings/special-dates` - Create special dates (admin only)
- `DELETE /api/bookings/special-dates/:id` - Delete special date (admin only)
- `POST /api/bookings/payment/:id` - Process payment for extra days

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **JWT Tokens**: Authentication uses JWT tokens with expiration
3. **HTTP-Only Cookies**: Tokens are stored in HTTP-only cookies for XSS protection
4. **CORS Protection**: API is protected with CORS
5. **Role-Based Access**: Different endpoints have different role requirements
6. **Rate Limiting**: Protection against brute force attacks and API abuse

## Project Structure

```
src/
├── app.js                 # Express app setup
├── config/
│   └── config.js          # App configuration
├── controllers/
│   ├── authController.js  # Authentication controller
│   ├── userController.js  # User management controller
│   ├── assetController.js # Asset management controller
│   └── bookingController.js # Booking controller
├── middleware/
│   ├── auth.js            # Authentication middleware
│   ├── rateLimit.js       # Rate limiting middleware
│   └── validation/        # Request validation middleware
├── models/
│   ├── User.js            # User model
│   ├── Asset.js           # Asset model
│   ├── Booking.js         # Booking model
│   └── SpecialDate.js     # Special date model
├── routes/
│   ├── authRoutes.js      # Authentication routes
│   ├── userRoutes.js      # User routes
│   ├── assetRoutes.js     # Asset routes
│   └── bookingRoutes.js   # Booking routes
└── utils/
    ├── jwtUtils.js        # JWT utilities
    ├── sendEmail.js       # Email sending utility
    └── seeder.js          # Database seeder
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| MONGO_URI | MongoDB connection string | mongodb://localhost:27017/assetBookingSystem |
| JWT_SECRET | Secret key for JWT token | yourSecretKey |
| JWT_EXPIRE | JWT token expiration | 30d |
| JWT_COOKIE_EXPIRE | Cookie expiration in days | 30 |
| SMTP_HOST | SMTP server host | - |
| SMTP_PORT | SMTP server port | - |
| SMTP_USERNAME | SMTP username | - |
| SMTP_PASSWORD | SMTP password | - |
| FROM_EMAIL | Sender email address | noreply@yourdomain.com |
| FROM_NAME | Sender name | Asset Booking System |
| BASE_URL | Base URL for email links | http://localhost:3000 |
| ACCOUNT_SETUP_URL_BASE | Absolute URL used for account setup links | {BASE_URL}/account-setup.html |
| PASSWORD_RESET_URL_BASE | Absolute URL used for reset password links | {BASE_URL}/reset-password.html |
| EMAIL_STRICT_TRANSPORT | Fail API calls when SMTP is missing or broken | true |
| ALLOW_EMAIL_MOCK_FALLBACK | Allow mock success after SMTP send errors | false |
| RATE_LIMIT_WINDOW | General rate limit window in ms | 900000 (15 minutes) |
| RATE_LIMIT_MAX | Maximum requests per window | 100 |
| AUTH_RATE_LIMIT_WINDOW | Auth rate limit window in ms | 3600000 (1 hour) |
| AUTH_RATE_LIMIT_MAX | Maximum login attempts per window | 5 |
| PASSWORD_RESET_RATE_LIMIT_WINDOW | Password reset rate limit window in ms | 3600000 (1 hour) |
| PASSWORD_RESET_RATE_LIMIT_MAX | Maximum password reset requests per window | 3 | 
