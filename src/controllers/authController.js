const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { getAccountSetupTemplate, getPasswordResetTemplate } = require('../utils/emailTemplates');
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

    // Create setup URL - point to the HTML page
    const setupUrl = `${config.baseUrl}/account-setup.html?token=${setupToken}`;

    // Get email template
    const emailTemplate = getAccountSetupTemplate(setupUrl, `${user.name} ${user.lastName}`);

    // Send email
    await sendEmail({
      email: user.email,
      subject: 'Welcome to Livo - Complete Your Account Setup',
      message: emailTemplate.text,
      html: emailTemplate.html
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

    // Get email template
    const emailTemplate = getPasswordResetTemplate(resetUrl, `${user.name} ${user.lastName}`);

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request - Livo',
        message: emailTemplate.text,
        html: emailTemplate.html
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

// @desc    Admin: send password reset email for a user
// @route   POST /api/auth/users/:userId/reset-password
// @access  Private/Admin
exports.adminResetUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${config.baseUrl}/reset-password/${resetToken}`;
    const emailTemplate = getPasswordResetTemplate(resetUrl, `${user.name} ${user.lastName}`);

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request - Livo',
        message: emailTemplate.text,
        html: emailTemplate.html
      });

      return res.status(200).json({
        success: true,
        data: { message: 'Password reset email sent', email: user.email }
      });
    } catch (emailErr) {
      console.error(emailErr);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        error: 'Email could not be sent'
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Change password (authenticated user)
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const { currentPassword, newPassword } = req.body;

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: 'Password updated successfully' }
    });
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