const mongoose = require('mongoose');
const User = require('./User');

const OwnerAnniversaryHistorySchema = new mongoose.Schema(
  {
    // Date-only (stored as UTC midnight)
    anniversaryDate: {
      type: Date,
      required: [true, 'Anniversary date is required']
    },
    // Date-only (stored as UTC midnight). Bookings with startDate >= effectiveFrom use this anchor.
    effectiveFrom: {
      type: Date,
      required: [true, 'Effective-from date is required']
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    updatedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const OwnerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  sharePercentage: {
    type: Number,
    required: [true, 'Share percentage is required'],
    min: [0, 'Share percentage cannot be negative'],
    max: [100, 'Share percentage cannot exceed 100%'],
    validate: {
      validator: function(value) {
        // Define standard percentages
        const standardPercentages = [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
        return standardPercentages.includes(value);
      },
      message: props => `${props.value} is not a valid share percentage.`
    }
  },
  since: {
    type: Date,
    default: Date.now
  },
  // Forward-only, effective-dated anniversary anchors (per user+asset)
  anniversaryHistory: {
    type: [OwnerAnniversaryHistorySchema],
    default: []
  }
});

const AssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Asset type is required'],
    enum: ['boat', 'home'],
    default: 'home'
  },
  description: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  locationAddress: {
    type: String,
    trim: true
  },
  propertyManager: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  capacity: {
    type: Number,
    min: [1, 'Capacity must be at least 1']
  },
  owners: [OwnerSchema],
  photos: [String],
  amenities: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validate total share percentage does not exceed 100%
AssetSchema.pre('validate', function(next) {
  if (this.owners && this.owners.length > 0) {
    const totalPercentage = this.owners.reduce((sum, owner) => sum + owner.sharePercentage, 0);
    if (totalPercentage > 100) {
      this.invalidate('owners', 'Total share percentage cannot exceed 100%');
    }
  }
  next();
});

// Index to optimize queries
AssetSchema.index({ name: 1 });
AssetSchema.index({ 'owners.user': 1 });

module.exports = mongoose.model('Asset', AssetSchema); 
