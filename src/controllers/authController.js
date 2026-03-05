const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { getAccountSetupTemplate, getPasswordResetTemplate } = require('../utils/emailTemplates');
const { sendTokenResponse } = require('../utils/jwtUtils');
const config = require('../config/config');

const FORGOT_PASSWORD_GENERIC_MESSAGE = 'If an account with that email exists, a password reset email has been sent.';
const isPendingSetupUser = (user) => !user.isActive || !user.password;

const hashToken = (token) =>
  crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

const buildTokenUrl = (baseUrl, token) => {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch (err) {
    const joiner = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${joiner}token=${encodeURIComponent(token)}`;
  }
};

const sendAccountSetupEmail = async (user) => {
  const setupToken = user.getAccountSetupToken();
  await user.save({ validateBeforeSave: false });

  const setupUrl = buildTokenUrl(config.accountSetupUrlBase, setupToken);
  const emailTemplate = getAccountSetupTemplate(setupUrl, `${user.name} ${user.lastName}`);

  await sendEmail({
    email: user.email,
    subject: 'Welcome to Livo - Complete Your Account Setup',
    message: emailTemplate.text,
    html: emailTemplate.html
  });
};

const sendPasswordResetEmail = async (user) => {
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = buildTokenUrl(config.passwordResetUrlBase, resetToken);
  const emailTemplate = getPasswordResetTemplate(resetUrl, `${user.name} ${user.lastName}`);

  await sendEmail({
    email: user.email,
    subject: 'Password Reset Request - Livo',
    message: emailTemplate.text,
    html: emailTemplate.html
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
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
  let user;
  let createdNow = false;

  try {
    const { name, lastName, email, phoneNumber, role } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    user = await User.findOne({ email: normalizedEmail });
    if (user) {
      if (isPendingSetupUser(user)) {
        await sendAccountSetupEmail(user);

        return res.status(200).json({
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
            message: 'User already existed and account setup email was resent'
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: 'User with that email already exists'
      });
    }

    // Create user
    user = await User.create({
      name,
      lastName,
      email: normalizedEmail,
      phoneNumber,
      role: role || 'user',
      isActive: false
    });
    createdNow = true;

    await sendAccountSetupEmail(user);

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

    // Roll back only when this request created the user.
    if (createdNow && user && isPendingSetupUser(user)) {
      await User.findByIdAndDelete(user._id);
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
    const setupToken = hashToken(req.params.token);

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

// @desc    Verify account setup token
// @route   GET /api/auth/account-setup/:token/verify
// @access  Public
exports.verifyAccountSetupToken = async (req, res) => {
  try {
    const setupToken = hashToken(req.params.token);
    const user = await User.findOne({
      accountSetupToken: setupToken,
      accountSetupExpire: { $gt: Date.now() }
    }).select('name lastName email accountSetupExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired setup token'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        email: user.email,
        userName: `${user.name} ${user.lastName}`.trim(),
        expiresAt: user.accountSetupExpire
      }
    });
  } catch (err) {
    return res.status(500).json({
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
    const normalizedEmail = String(req.body.email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        success: true,
        data: FORGOT_PASSWORD_GENERIC_MESSAGE
      });
    }

    try {
      await sendPasswordResetEmail(user);

      res.status(200).json({
        success: true,
        data: FORGOT_PASSWORD_GENERIC_MESSAGE
      });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'Could not send password reset email'
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Verify reset password token
// @route   GET /api/auth/reset-password/:token/verify
// @access  Public
exports.verifyResetPasswordToken = async (req, res) => {
  try {
    const resetPasswordToken = hashToken(req.params.token);

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('name lastName email resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        email: user.email,
        userName: `${user.name} ${user.lastName}`.trim(),
        expiresAt: user.resetPasswordExpire
      }
    });
  } catch (err) {
    return res.status(500).json({
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
    const resetPasswordToken = hashToken(req.params.token);

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

    if (!user.isActive || !user.password) {
      return res.status(400).json({
        success: false,
        error: 'User has not completed account setup. Send setup email instead.'
      });
    }

    try {
      await sendPasswordResetEmail(user);

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

// @desc    Admin: resend account setup email for a user
// @route   POST /api/auth/users/:userId/resend-account-setup
// @access  Private/Admin
exports.adminResendAccountSetup = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.isActive && user.password) {
      return res.status(400).json({
        success: false,
        error: 'User account is already active'
      });
    }

    await sendAccountSetupEmail(user);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Account setup email sent',
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: 'Email could not be sent'
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
