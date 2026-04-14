const mongoose = require('mongoose');

const BlockedDateSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: [true, 'Asset is required for blocked dates']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  blockType: {
    type: String,
    required: [true, 'Block type is required'],
    enum: ['maintenance', 'rental', 'other'],
    default: 'other'
  },
  reason: {
    type: String,
    trim: true,
    default: ''
  },
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required']
  },
  // Audit fields for overlap confirmation
  createdWithForce: {
    type: Boolean,
    default: false
  },
  overlapNote: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validation to ensure endDate is after startDate
BlockedDateSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

// Update the updatedAt timestamp before saving
BlockedDateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index to optimize queries for asset-specific blocks
BlockedDateSchema.index({ asset: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('BlockedDate', BlockedDateSchema);
