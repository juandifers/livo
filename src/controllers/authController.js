const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { sendTokenResponse } = require('../utils/jwtUtils');
const config = require('../config/config');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password is set (account setup completed)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: 'Account setup not completed. Please check your email for setup instructions.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Your account is not active. Please complete the account setup.'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create token and send response
    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create new user (admin only)
// @route   POST /api/auth/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { name, lastName, email, phoneNumber, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        error: 'User with that email already exists'
      });
    }

    // Create user
    user = await User.create({
      name,
      lastName,
      email,
      phoneNumber,
      role: role || 'user',
      isActive: false
    });

    // Generate account setup token
    const setupToken = user.getAccountSetupToken();
    await user.save({ validateBeforeSave: false });

    // Create setup URL
    const setupUrl = `${config.baseUrl}/account-setup/${setupToken}`;

    // Create message
    const message = `You have been invited to join the Asset Booking System. Please use the following link to set up your account:\n\n${setupUrl}\n\nThis link is valid for 24 hours.`;

    // HTML version of the message
    const html = `
      <h1>Welcome to Livo</h1>
      <p>You have been invited to join Livo.</p>
      <p>Please click the link below to set up your account:</p>
      <p><a href="${setupUrl}">Set up your account</a></p>
      <p>This link is valid for 24 hours.</p>
      <p>If you did not request this invitation, please ignore this email.</p>
    `;

    // Send email
    await sendEmail({
      email: user.email,
      subject: 'Account Setup Instructions',
      message,
      html
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isActive: user.isActive
        },
        message: 'Account setup email sent'
      }
    });
  } catch (err) {
    console.error(err);
    
    // If there was an error sending email, remove user and return error
    if (err.message.includes('ECONNREFUSED')) {
      await User.findOneAndDelete({ email: req.body.email });
      return res.status(500).json({
        success: false,
        error: 'Email could not be sent. User creation aborted.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Account setup (from email link)
// @route   POST /api/auth/account-setup/:token
// @access  Public
exports.accountSetup = async (req, res) => {
  try {
    // Get hashed token
    const setupToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user by setup token and check if token is still valid
    const user = await User.findOne({
      accountSetupToken: setupToken,
      accountSetupExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired setup token'
      });
    }

    // Set new password and activate account
    user.password = req.body.password;
    user.isActive = true;
    user.accountSetupToken = undefined;
    user.accountSetupExpire = undefined;

    await user.save();

    // Create token and send response
    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with that email'
      });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${config.baseUrl}/reset-password/${resetToken}`;

    // Create message
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please use the following link to reset your password:\n\n${resetUrl}\n\nThis link is valid for 10 minutes.`;

    // HTML version of the message
    const html = `
      <h1>Password Reset</h1>
      <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
      <p>Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link is valid for 10 minutes.</p>
      <p>If you did not request this reset, please ignore this email.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        message,
        html
      });

      res.status(200).json({
        success: true,
        data: 'Email sent'
      });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'Email could not be sent'
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user by reset token and check if token is still valid
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Create token and send response
    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
}; 