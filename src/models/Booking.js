const mongoose = require('mongoose');

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

// Index to optimize queries
BookingSchema.index({ user: 1, asset: 1, startDate: 1, endDate: 1 });
BookingSchema.index({ asset: 1, status: 1, startDate: 1, endDate: 1 });
BookingSchema.index({ specialDateType: 1, year: 1 });
BookingSchema.index({ shortTermCancelled: 1, status: 1 });
BookingSchema.index({ isExtraDays: 1 });
BookingSchema.index({ isShortTerm: 1, isVeryShortTerm: 1 });

module.exports = mongoose.model('Booking', BookingSchema); 