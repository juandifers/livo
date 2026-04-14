const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { VALID_OWNERSHIP_PERCENTAGES } = require('@livo/contracts');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password in queries
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  // Fields for account setup
  accountSetupToken: String,
  accountSetupExpire: Date,
  // Fields for password reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Add owned assets to the user schema
  ownedAssets: [{
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset'
    },
    sharePercentage: {
      type: Number,
      required: true,
      validate: {
        validator: function(value) {
          return VALID_OWNERSHIP_PERCENTAGES.includes(value);
        },
        message: props => `${props.value} is not a valid share percentage. Must be one of the standard percentages.`
      }
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    purchasePrice: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  // Only run this function if password was modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate account setup token
userSchema.methods.getAccountSetupToken = function() {
  // Generate token
  const setupToken = crypto.randomBytes(32).toString('hex');

  // Hash token and set to accountSetupToken field
  this.accountSetupToken = crypto
    .createHash('sha256')
    .update(setupToken)
    .digest('hex');

  // Set expire (24 hours)
  this.accountSetupExpire = Date.now() + 24 * 60 * 60 * 1000;

  return setupToken;
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (10 min)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema); 