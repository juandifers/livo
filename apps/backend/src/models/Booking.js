const mongoose = require('mongoose');
const Asset = require('./Asset');
const { MIN_STAY_HOME, MIN_STAY_BOAT, MAX_BOOKING_LENGTH } = require('@livo/contracts');

const BookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: [true, 'Asset ID is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  isShortTerm: {
    type: Boolean,
    default: false
  },
  isVeryShortTerm: {
    type: Boolean,
    default: false
  },
  specialDateType: {
    type: String,
    enum: ['type1', 'type2', null],
    default: null
  },
  year: {
    type: Number,
    default: function() {
      return this.startDate ? new Date(this.startDate).getFullYear() : new Date().getFullYear();
    }
  },
  // Fields for short-term cancellation tracking
  shortTermCancelled: {
    type: Boolean,
    default: false
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  reassignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reassignedAt: {
    type: Date,
    default: null
  },
  // Fields for partial rebooking tracking
  originalDays: {
    type: Number,
    default: null // Total days of the original booking
  },
  rebookedDays: {
    type: Number,
    default: 0 // Days that have been rebooked by others
  },
  remainingPenaltyDays: {
    type: Number,
    default: null // Days still counting as penalty (originalDays - rebookedDays)
  },
  // Fields for extra paid days tracking
  isExtraDays: {
    type: Boolean,
    default: false
  },
  extraDayCount: {
    type: Number,
    default: 0,
    min: 0
  },
  extraDayCost: {
    type: Number,
    default: 0,
    min: 0
  },
  extraDaysPaid: {
    type: Boolean,
    default: false
  },
  paymentId: {
    type: String,
    default: null
  },
  // Fields for admin override tracking (FEAT-ADMIN-OVR-001)
  adminOverride: {
    type: Boolean,
    default: false
  },
  overrideByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  overrideAt: {
    type: Date,
    default: null
  },
  overrideReasons: {
    type: [String],
    default: []
  },
  overrideNote: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate booking duration in days
BookingSchema.virtual('durationDays').get(function() {
  // Add 1 to include both start and end dates
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
});

// Virtual field for booking type based on flags
BookingSchema.virtual('bookingType').get(function() {
  if (this.isVeryShortTerm) {
    return 'Very Short Term';
  } else if (this.isShortTerm) {
    return 'Short Term';
  } else {
    return 'Long Term';
  }
});

// Ensure virtuals are included in JSON/Object output
BookingSchema.set('toJSON', { virtuals: true });
BookingSchema.set('toObject', { virtuals: true });

// Validation to ensure endDate is after startDate
BookingSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

// Prevent overlapping bookings for the same asset
BookingSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('startDate') || this.isModified('endDate')) {
    const overlappingBooking = await this.constructor.findOne({
      asset: this.asset,
      status: { $ne: 'cancelled' },
      $or: [
        // New booking starts during an existing booking
        { startDate: { $lte: this.startDate }, endDate: { $gte: this.startDate } },
        // New booking ends during an existing booking
        { startDate: { $lte: this.endDate }, endDate: { $gte: this.endDate } },
        // New booking completely contains an existing booking
        { startDate: { $gte: this.startDate }, endDate: { $lte: this.endDate } }
      ],
      _id: { $ne: this._id } // Exclude current booking when updating
    });

    if (overlappingBooking) {
      return next(new Error('This time period overlaps with an existing booking'));
    }
  }
  next();
});

// TODO: check if this complies with day tracker and not night tracker
// Enforce minimum and maximum stay based on asset type
BookingSchema.pre('validate', async function(next) {
  try {
    if (!this.startDate || !this.endDate || !this.asset) return next();

    const asset = await Asset.findById(this.asset).select('type');
    if (!asset) return next(new Error('Asset not found for booking'));

    const totalDays = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1; //TODO: remove +1 if this is not correct

    // Debug logging for 1-day bookings
    console.log('🔍 Booking validation - Duration check:', {
      assetType: asset.type,
      startDate: this.startDate,
      endDate: this.endDate,
      diff: this.endDate - this.startDate,
      totalDays: totalDays,
      minStay: asset.type === 'boat' ? MIN_STAY_BOAT : MIN_STAY_HOME
    });

    const minStay = asset.type === 'boat' ? MIN_STAY_BOAT : MIN_STAY_HOME;
    if (totalDays < minStay) {
      console.error('❌ Booking rejected - minimum stay violation:', {
        totalDays,
        minStay,
        assetType: asset.type
      });
      return next(new Error(`Minimum stay for ${asset.type} is ${minStay} day${minStay > 1 ? 's' : ''}`));
    }

    const maxStay = MAX_BOOKING_LENGTH;
    if (totalDays > maxStay) {
      return next(new Error(`A continuous stay cannot exceed ${maxStay} days`));
    }

    console.log('✅ Booking validation passed - total days:', totalDays);
    return next();
  } catch (err) {
    console.error('❌ Booking validation error:', err);
    return next(err);
  }
});

// Index to optimize queries
BookingSchema.index({ user: 1, asset: 1, startDate: 1, endDate: 1 });
BookingSchema.index({ asset: 1, status: 1, startDate: 1, endDate: 1 });
BookingSchema.index({ status: 1, cancelledAt: -1, asset: 1, user: 1 });
BookingSchema.index({ specialDateType: 1, year: 1 });
BookingSchema.index({ shortTermCancelled: 1, status: 1 });
BookingSchema.index({ isExtraDays: 1 });
BookingSchema.index({ isShortTerm: 1, isVeryShortTerm: 1 });
BookingSchema.index({ adminOverride: 1 });

module.exports = mongoose.model('Booking', BookingSchema); 
