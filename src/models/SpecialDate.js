const mongoose = require('mongoose');

const SpecialDateSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    // Allow universal special dates by leaving asset null
    default: null
  },
  type: {
    type: String,
    required: [true, 'Special date type is required'],
    enum: ['type1', 'type2']
  },
  name: {
    type: String,
    required: [true, 'Special date name is required'],
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date, 
    required: [true, 'End date is required']
  },
  repeatYearly: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validation to ensure endDate is after startDate
SpecialDateSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

// Index to optimize queries (sparse allows null asset)
SpecialDateSchema.index({ asset: 1, type: 1 }, { sparse: true });

module.exports = mongoose.model('SpecialDate', SpecialDateSchema); 