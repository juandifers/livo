const Booking = require('../models/Booking');
const User = require('../models/User');
const Asset = require('../models/Asset');
const SpecialDate = require('../models/SpecialDate');
const DateUtils = require('../utils/dateUtils');
const sendEmail = require('../utils/sendEmail');
const {
  getBookingConfirmationTemplate,
  getBookingCancellationTemplate
} = require('../utils/emailTemplates');

const getUserDisplayName = (user) => {
  if (!user) return 'there';
  const firstName = user.name || '';
  const lastName = user.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user.email || 'there';
};

const formatBookingRange = (booking) => {
  const start = DateUtils.formatForApi(booking.startDate);
  const end = DateUtils.formatForApi(booking.endDate);
  return `${start} to ${end}`;
};

const formatBookingForResponse = (booking) => {
  if (!booking) return booking;

  const bookingObj = typeof booking.toObject === 'function' ? booking.toObject() : { ...booking };
  return {
    ...bookingObj,
    startDate: DateUtils.formatForApi(bookingObj.startDate),
    endDate: DateUtils.formatForApi(bookingObj.endDate),
    createdAt: bookingObj.createdAt ? DateUtils.formatForApi(bookingObj.createdAt) : null,
    cancelledAt: bookingObj.cancelledAt ? DateUtils.formatForApi(bookingObj.cancelledAt) : null,
    reassignedAt: bookingObj.reassignedAt ? DateUtils.formatForApi(bookingObj.reassignedAt) : null,
    overrideAt: bookingObj.overrideAt ? DateUtils.formatForApi(bookingObj.overrideAt) : null,
    paymentDate: bookingObj.paymentDate ? DateUtils.formatForApi(bookingObj.paymentDate) : null
  };
};

const trySendBookingConfirmationEmail = async ({ user, asset, bookings, createdByAdmin = false }) => {
  try {
    if (!user?.email || !Array.isArray(bookings) || bookings.length === 0) {
      return;
    }

    const bookingRanges = bookings.map(formatBookingRange);
    const emailTemplate = getBookingConfirmationTemplate({
      userName: getUserDisplayName(user),
      assetName: asset?.name || 'your asset',
      bookingRanges,
      createdByAdmin
    });

    await sendEmail({
      email: user.email,
      subject: `Booking Confirmed - ${asset?.name || 'Livo'}`,
      message: emailTemplate.text,
      html: emailTemplate.html
    });
  } catch (err) {
    console.error('Booking confirmation email failed:', err.message);
  }
};

const trySendBookingCancellationEmail = async ({ user, asset, booking, cancelledByAdmin = false }) => {
  try {
    if (!user?.email || !booking) {
      return;
    }

    const emailTemplate = getBookingCancellationTemplate({
      userName: getUserDisplayName(user),
      assetName: asset?.name || 'your asset',
      bookingRange: formatBookingRange(booking),
      cancelledByAdmin
    });

    await sendEmail({
      email: user.email,
      subject: `Booking Cancelled - ${asset?.name || 'Livo'}`,
      message: emailTemplate.text,
      html: emailTemplate.html
    });
  } catch (err) {
    console.error('Booking cancellation email failed:', err.message);
  }
};

// Constants for booking rules
const DAYS_PER_EIGHTH_SHARE = 44; // Days allowed per 1/8 share (12.5%)
const MAX_BOOKING_LENGTH = 14; // Maximum days for a continuous stay
const STANDARD_BOOKING_LENGTH = 7; // Standard booking length
const MAX_ADVANCE_BOOKING_YEARS = 2; // Maximum years in advance for booking
const MAX_ACTIVE_BOOKINGS_PER_EIGHTH = 6; // Maximum active bookings per 1/8 share (>60 days only)
const MIN_ADVANCE_DAYS = 0; // Real-time bookings allowed
const SHORT_TERM_MIN_DAYS = 7; // <7 days = very short term
const SHORT_TERM_MAX_DAYS = 60; // Short-term window up to 60 days for all assets
const EXTRA_DAYS_PER_EIGHTH = 10; // Extra paid days allowed per 1/8 share
const EXTRA_DAY_COST = 100; // Cost per extra day in default currency, placeholder
const MIN_STAY_BOAT = 1; // Minimum stay for boats in days
const MIN_STAY_HOME = 2; // Minimum stay for homes in days
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Helper function to calculate allowed days based on share percentage
const calculateAllowedDays = (sharePercentage) => {
  // 12.5% (1/8) = 44 days
  return Math.floor((sharePercentage / 12.5) * DAYS_PER_EIGHTH_SHARE);
};

// Helper function to calculate max active bookings based on share percentage
const calculateMaxActiveBookings = (sharePercentage) => {
  // 12.5% (1/8) = 6 bookings
  return Math.floor((sharePercentage / 12.5) * MAX_ACTIVE_BOOKINGS_PER_EIGHTH);
};

// Helper function to calculate extra allowed days based on share percentage
const calculateExtraAllowedDays = (sharePercentage) => {
  // 12.5% (1/8) = 10 extra days
  return Math.floor((sharePercentage / 12.5) * EXTRA_DAYS_PER_EIGHTH);
};

// Helper function to calculate max consecutive booking days based on share percentage
const calculateMaxConsecutiveDays = (sharePercentage) => {
  // 12.5% (1/8) = MAX_BOOKING_LENGTH days
  return Math.floor((sharePercentage / 12.5) * MAX_BOOKING_LENGTH);
};

// Helper function to calculate booking duration in days (inclusive of both start and end dates)
const calculateBookingDays = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 0;
  }
  return DateUtils.calculateBookingDays(startDate, endDate);
};

// Helper function to normalize date strings to YYYY-MM-DD format
const normalizeDateString = (dateStr) => {
  return DateUtils.normalize(dateStr);
};

const toUtcDateOnly = (value = new Date()) => {
  const parsed = value instanceof Date ? value : DateUtils.parseApiDate(value);
  return DateUtils.parseApiDate(DateUtils.formatUtcDateOnly(parsed));
};

const resolveOwnerAnniversaryAnchor = (owner, effectiveDate = new Date()) => {
  const effectiveDateOnly = toUtcDateOnly(effectiveDate);
  const history = Array.isArray(owner?.anniversaryHistory) ? owner.anniversaryHistory : [];
  const effectiveEntry = history
    .filter((entry) => (
      entry
      && entry.effectiveFrom
      && entry.anniversaryDate
      && toUtcDateOnly(entry.effectiveFrom).getTime() <= effectiveDateOnly.getTime()
    ))
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];

  const fallbackAnchor = owner?.since || effectiveDateOnly;
  const anchorDate = toUtcDateOnly(effectiveEntry?.anniversaryDate || fallbackAnchor);

  return { anchorDate, effectiveDate: effectiveDateOnly };
};

const getOwnerAllocationWindowForDate = (owner, targetDate = new Date()) => {
  const targetDateOnly = toUtcDateOnly(targetDate);
  const { anchorDate } = resolveOwnerAnniversaryAnchor(owner, targetDateOnly);
  const rolling = DateUtils.getRollingAnniversaryWindows(anchorDate, targetDateOnly);
  // Booking dates are inclusive; represent the rolling window as inclusive bounds.
  const inclusiveWindowEnd = new Date(rolling.currentWindow.end.getTime() - DAY_IN_MS);

  return {
    windowStart: rolling.currentWindow.start,
    windowEnd: inclusiveWindowEnd,
    windowStartStr: rolling.currentWindow.startStr,
    windowEndStr: DateUtils.formatForApi(inclusiveWindowEnd)
  };
};

// Helper function to check booking time frame constraints
const validateBookingTimeframe = async (startDate, endDate, assetId, sharePercentage) => {
  // Use a date-only UTC baseline to avoid timezone-dependent boundary shifts.
  const today = DateUtils.parseApiDate(DateUtils.formatUtcDateOnly(new Date()));
  const maxFutureDate = new Date(Date.UTC(
    today.getUTCFullYear() + MAX_ADVANCE_BOOKING_YEARS,
    today.getUTCMonth(),
    today.getUTCDate()
  ));
  
  // Use DateUtils for consistent date handling (already UTC midnight dates)
  const bookingStartDate = startDate instanceof Date ? startDate : DateUtils.parseApiDate(startDate);
  const bookingEndDate = endDate instanceof Date ? endDate : DateUtils.parseApiDate(endDate);
  
  if (!bookingStartDate || !bookingEndDate) {
    return {
      isValid: false,
      error: 'Invalid date format provided'
    };
  }
  
  // Cannot book in the past
  if (bookingStartDate < today) {
    return {
      isValid: false,
      error: 'Cannot book dates in the past'
    };
  }
  
  // No minimum advance days (real-time booking allowed)
  const daysInAdvance = Math.ceil((bookingStartDate - today) / (1000 * 60 * 60 * 24));
  
  // Cannot book more than MAX_ADVANCE_BOOKING_YEARS years in advance
  if (bookingStartDate > maxFutureDate || bookingEndDate > maxFutureDate) {
    return {
      isValid: false,
      error: `Cannot book more than ${MAX_ADVANCE_BOOKING_YEARS} years in advance`
    };
  }
  
  // Check if booking exceeds max consecutive days based on ownership share
  const bookingDays = calculateBookingDays(bookingStartDate, bookingEndDate);
  const maxConsecutiveDays = calculateMaxConsecutiveDays(sharePercentage);
  
  console.log('🔍 validateBookingTimeframe - Duration check:', {
    bookingDays,
    maxConsecutiveDays,
    startDate: bookingStartDate.toISOString(),
    endDate: bookingEndDate.toISOString()
  });
  
  if (bookingDays > maxConsecutiveDays) {
    return {
      isValid: false,
      error: `A continuous stay cannot exceed ${maxConsecutiveDays} days for your ownership share`
    };
  }
  
  // Check minimum stay based on asset type
  const asset = await Asset.findById(assetId);
  if (!asset) {
    return {
      isValid: false,
      error: 'Asset not found'
    };
  }
  
  const minStay = asset.type === 'boat' ? MIN_STAY_BOAT : MIN_STAY_HOME;
  console.log('🔍 validateBookingTimeframe - Minimum stay check:', {
    bookingDays,
    minStay,
    assetType: asset.type,
    wouldPass: bookingDays >= minStay
  });
  
  if (bookingDays < minStay) {
    console.error('❌ MINIMUM STAY VALIDATION FAILED:', {
      bookingDays,
      minStay,
      assetType: asset.type
    });
    return {
      isValid: false,
      error: `Minimum stay for ${asset.type} is ${minStay} day${minStay > 1 ? 's' : ''}`
    };
  }
  
  return { isValid: true };
};

// Helper function to count universal active bookings for a user on an asset
// FEAT-ACTIVE-001: Universal counter that does NOT change based on UI year/window selection
// Uses weighted counting with startDate-driven exclusion per RULE-HOME-019 / RULE-BOAT-019
const getShortTermThresholdDaysByAssetType = (assetType) => (
  assetType === 'boat' ? 30 : SHORT_TERM_MAX_DAYS
);

const countUniversalActiveBookings = async (userId, assetId, options = {}) => {
  const now = options.now || new Date();
  const perf = options.perf;

  // Reuse already-fetched assetType when available to avoid an extra query.
  let assetType = options.assetType;
  if (!assetType) {
    const assetLookupStartedAt = Date.now();
    const asset = await Asset.findById(assetId).select('type').lean();
    perf?.add('dbRead', Date.now() - assetLookupStartedAt);
    if (!asset) {
      return 0;
    }
    assetType = asset.type;
  }

  // Determine exclusion threshold based on asset type
  // RULE-HOME-019: homes exclude if startDate <= now + 60 days
  // RULE-BOAT-019: boats exclude if startDate <= now + 30 days
  const exclusionThresholdDays = getShortTermThresholdDaysByAssetType(assetType);
  const exclusionDate = new Date(now.getTime() + exclusionThresholdDays * 24 * 60 * 60 * 1000);
  
  // Query all active bookings (status != 'cancelled', endDate >= now)
  const bookingsQueryStartedAt = Date.now();
  const bookings = await Booking.find({
    user: userId,
    asset: assetId,
    status: { $ne: 'cancelled' },
    endDate: { $gte: now }
  }).select('startDate endDate').lean();
  perf?.add('dbRead', Date.now() - bookingsQueryStartedAt);
  
  // Apply weighting and exclusion
  const computeStartedAt = Date.now();
  let weightedCount = 0;
  
  for (const booking of bookings) {
    // Exclude bookings within threshold (using startDate ONLY, not end date)
    // This aligns with PRD FR-ACTIVE-002 and RULE-*-019
    if (booking.startDate <= exclusionDate) {
      continue; // Skip this booking from the count
    }
    
    // Apply weighting based on duration
    const durationDays = calculateBookingDays(booking.startDate, booking.endDate);
    
    // RULE-HOME-011 / RULE-BOAT-011: Weighting by stay length
    let weight = 0;
    if (assetType === 'boat') {
      // Boats: 1-7 days => 1, 8-14 days => 2
      if (durationDays >= 1 && durationDays <= 7) {
        weight = 1;
      } else if (durationDays >= 8 && durationDays <= 14) {
        weight = 2;
      }
    } else {
      // Homes: 2-7 days => 1, 8-14 days => 2
      if (durationDays >= 2 && durationDays <= 7) {
        weight = 1;
      } else if (durationDays >= 8 && durationDays <= 14) {
        weight = 2;
      }
    }
    
    weightedCount += weight;
  }
  perf?.add('compute', Date.now() - computeStartedAt);
  
  return weightedCount;
};

// Helper function to count active bookings for a user on an asset within a specific year
// DEPRECATED: Use countUniversalActiveBookings() for new features
// Kept for backward compatibility with existing code that relies on year-scoped counting
const countActiveBookings = async (userId, assetId, year = null, options = {}) => {
  const now = options.now || new Date();
  const targetYear = year || now.getFullYear();
  const perf = options.perf;

  let assetType = options.assetType;
  if (!assetType) {
    const assetLookupStartedAt = Date.now();
    const asset = await Asset.findById(assetId).select('type').lean();
    perf?.add('dbRead', Date.now() - assetLookupStartedAt);
    assetType = asset?.type;
  }
  
  const hasCustomWindow = options.windowStart instanceof Date && options.windowEnd instanceof Date;
  const windows = hasCustomWindow ? null : computeYearlyAllocationWindows(targetYear);
  const effectiveWindow = hasCustomWindow
    ? {
      windowStart: options.windowStart,
      windowEnd: options.windowEnd
    }
    : {
      windowStart: windows.currentYear.start,
      windowEnd: windows.currentYear.end
    };
  
  const bookingsQueryStartedAt = Date.now();
  const bookings = await Booking.find({
    user: userId,
    asset: assetId,
    status: { $ne: 'cancelled' },
    endDate: { $gte: now }, // Only future bookings
    startDate: { 
      $gte: effectiveWindow.windowStart,
      $lte: effectiveWindow.windowEnd 
    }
  }).select('startDate endDate').lean();
  perf?.add('dbRead', Date.now() - bookingsQueryStartedAt);

  const shortTermMaxDays = typeof options.shortTermMaxDays === 'number'
    ? options.shortTermMaxDays
    : getShortTermThresholdDaysByAssetType(assetType);

  const computeStartedAt = Date.now();
  const count = bookings.reduce((count, booking) => (
    isBookingInShortTermWindow(assetId, booking.startDate, booking.endDate, { now, shortTermMaxDays })
      ? count
      : count + 1
  ), 0);
  perf?.add('compute', Date.now() - computeStartedAt);
  return count;
};

// Helper function to check for booking overlaps
const checkBookingOverlap = async (userId, assetId, newStartDate, newEndDate) => {
  const newStart = DateUtils.parseApiDate(newStartDate);
  const newEnd = DateUtils.parseApiDate(newEndDate);
  
  // Find any existing bookings that overlap with the new booking
  const overlappingBookings = await Booking.find({
    user: userId,
    asset: assetId,
    status: { $ne: 'cancelled' },
    $or: [
      // New booking starts during existing booking
      { startDate: { $lte: newStart }, endDate: { $gte: newStart } },
      // New booking ends during existing booking  
      { startDate: { $lte: newEnd }, endDate: { $gte: newEnd } },
      // New booking completely contains existing booking
      { startDate: { $gte: newStart }, endDate: { $lte: newEnd } }
    ]
  });
  
  return {
    hasOverlap: overlappingBookings.length > 0,
    overlappingBookings: overlappingBookings.map(b => ({
      id: b._id,
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status
    }))
  };
};

// Helper function to calculate minimum gap between bookings
const calculateBookingGap = async (userId, assetId, newStartDate, newEndDate) => {
  const now = new Date();
  
  // Parse date components using DateUtils first
  const newStartDateObj = DateUtils.parseApiDate(newStartDate);
  const newEndDateObj = DateUtils.parseApiDate(newEndDate);
  const newBookingDuration = DateUtils.calculateBookingDays(newStartDateObj, newEndDateObj);
  
  // Find the most recent booking that ends before the new booking starts
  const lastBooking = await Booking.findOne({
    user: userId,
    asset: assetId,
    status: { $ne: 'cancelled' },
    endDate: { $lt: newStartDateObj }
  }).sort({ endDate: -1 });
  
  // Find the next upcoming booking after the proposed new booking
  const nextBooking = await Booking.findOne({
    user: userId,
    asset: assetId,
    status: { $ne: 'cancelled' },
    startDate: { $gt: newEndDateObj }
  }).sort({ startDate: 1 });
  
  let minGapResult = {
    hasMinGapConstraint: false,
    minimumGap: 0,
    daysBetweenBookings: 0,
    lastBookingEndDate: null
  };
  
  // Calculate minimum gap based on previous booking (exclusive in-between days)
  if (lastBooking) {
    const lastStayDuration = calculateBookingDays(lastBooking.startDate, lastBooking.endDate);
    
    const startMidnight = new Date(newStartDateObj);
    startMidnight.setHours(0, 0, 0, 0);
    const lastEndMidnight = new Date(lastBooking.endDate);
    lastEndMidnight.setHours(0, 0, 0, 0);
    // Exclusive in-between days: subtract 1 so that a booking ending on the 24th requires
    // the 25th and 26th as rest days before starting on the 27th for a 2-day last stay
    const rawDiffDays = Math.max(0, Math.floor((startMidnight - lastEndMidnight) / (1000 * 60 * 60 * 24)));
    const daysBetweenBookings = Math.max(0, rawDiffDays - 1);
    
    minGapResult = {
      hasMinGapConstraint: true,
      minimumGap: lastStayDuration,
      daysBetweenBookings,
      lastBookingEndDate: lastBooking.endDate
    };
  }
  
  // Also check gap requirement for the next booking
  let nextGapResult = {
    hasMinGapConstraint: false,
    minimumGap: 0,
    daysBetweenBookings: 0,
    nextBookingStartDate: null
  };
  
  if (nextBooking) {
    const nextStayDuration = calculateBookingDays(nextBooking.startDate, nextBooking.endDate);
    
    const endMidnight = new Date(newEndDateObj);
    endMidnight.setHours(0, 0, 0, 0);
    const nextStartMidnight = new Date(nextBooking.startDate);
    nextStartMidnight.setHours(0, 0, 0, 0);
    // Exclusive in-between days: subtract 1 so that a booking ending on the 24th requires
    // the 25th and 26th as rest days before starting on the 27th for a 2-day next stay
    const rawDiffDays = Math.max(0, Math.floor((nextStartMidnight - endMidnight) / (1000 * 60 * 60 * 24)));
    const daysBetweenBookings = Math.max(0, rawDiffDays - 1);
    
    nextGapResult = {
      hasMinGapConstraint: true,
      minimumGap: newBookingDuration, // Gap should be equal to the new booking duration
      daysBetweenBookings,
      nextBookingStartDate: nextBooking.startDate
    };
  }
  
  return { minGapResult, nextGapResult };
};

// Helper function to check if booking is short-term
const isShortTermBooking = async (assetId, startDate) => {
  const now = new Date();
  // Normalize date to YYYY-MM-DD format first, then parse components
  const normalizedStartDate = normalizeDateString(startDate);
  if (!normalizedStartDate) {
    return { isShortTerm: false, isVeryShortTerm: false, canUseExtraDays: false };
  }
  
  const startParts = normalizedStartDate.split('-');
  const bookingStart = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
  const daysInAdvance = Math.ceil((bookingStart - now) / (1000 * 60 * 60 * 24));

  // Determine short-term threshold by asset type
  let shortTermMaxDays = SHORT_TERM_MAX_DAYS; // default (homes)
  try {
    if (assetId) {
      const asset = await Asset.findById(assetId).select('type');
      if (asset && asset.type === 'boat') {
        shortTermMaxDays = 30;
      } else {
        shortTermMaxDays = SHORT_TERM_MAX_DAYS; // homes: 60 days
      }
    }
  } catch (_) {
    // If asset lookup fails, fall back to default thresholds
    shortTermMaxDays = SHORT_TERM_MAX_DAYS;
  }

  if (daysInAdvance < SHORT_TERM_MIN_DAYS) {
    return { isShortTerm: true, isVeryShortTerm: true, canUseExtraDays: true };
  }
  if (daysInAdvance >= SHORT_TERM_MIN_DAYS && daysInAdvance <= shortTermMaxDays) {
    return { isShortTerm: true, isVeryShortTerm: false, canUseExtraDays: false };
  }
  return { isShortTerm: false, isVeryShortTerm: false, canUseExtraDays: false };
};

// Helper function to check if a booking is currently in the short-term window
// This checks if the ENTIRE booking duration falls within the short-term window
const isBookingInShortTermWindow = (_assetId, bookingStartDate, bookingEndDate, options = {}) => {
  const now = options.now || new Date();
  const daysToStart = Math.ceil((bookingStartDate - now) / (1000 * 60 * 60 * 24));
  const daysToEnd = Math.ceil((bookingEndDate - now) / (1000 * 60 * 60 * 24));

  const shortTermMaxDays = typeof options.shortTermMaxDays === 'number'
    ? options.shortTermMaxDays
    : getShortTermThresholdDaysByAssetType(options.assetType);

  // Booking is in short-term window if BOTH start and end dates are within the threshold
  return daysToStart <= shortTermMaxDays && daysToEnd <= shortTermMaxDays;
};

// Compute yearly allocation windows (January 1st to December 31st)
const computeYearlyAllocationWindows = (year = null) => {
  return DateUtils.getYearlyAllocationWindows(year);
};

// Legacy function for backward compatibility - now uses current year
const computeAllocationWindow = (ownershipSinceDate) => {
  const windows = computeYearlyAllocationWindows();
  return windows.currentYear;
};

// Check for special date overlap types in a period
const getOverlappingSpecialDateTypes = async (startDate, endDate) => {
  if (!startDate || !endDate) {
    return [];
  }
  
  const specialDates = await SpecialDate.find({ asset: null });
  const bookingStart = new Date(startDate);
  const bookingEnd = new Date(endDate);
  const types = new Set();
  
  specialDates.forEach(sd => {
    if (sd.repeatYearly) {
      // Handle yearly repetition
      const originalStart = new Date(sd.startDate);
      const originalEnd = new Date(sd.endDate);
      
      // Check for overlap in the booking's year and adjacent years
      const bookingYear = bookingStart.getFullYear();
      for (let year = bookingYear - 1; year <= bookingYear + 1; year++) {
        const s = new Date(originalStart);
        s.setFullYear(year);
        const e = new Date(originalEnd);
        e.setFullYear(year);
        
        if (bookingStart <= e && bookingEnd >= s) {
          types.add(sd.type);
          break; // Found overlap, no need to check other years
        }
      }
    } else {
      // One-time special date
      const s = new Date(sd.startDate);
      const e = new Date(sd.endDate);
      if (bookingStart <= e && bookingEnd >= s) {
        types.add(sd.type);
      }
    }
  });
  
  return Array.from(types);
};

// Helper function to check if date falls within a special date range
const checkSpecialDateBookings = async (userId, _assetId, startDate, endDate, _sharePercentage) => {
  // Determine overlap with universal special dates
  const overlappingTypes = await getOverlappingSpecialDateTypes(startDate, endDate);
  if (overlappingTypes.length === 0) {
    return { isValid: true };
  }

  // Enforce cap only when the new booking is more than 60 days away
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + SHORT_TERM_MAX_DAYS * 24 * 60 * 60 * 1000);
  // Normalize date to YYYY-MM-DD format first, then parse components
  const normalizedStartDate = normalizeDateString(startDate);
  if (!normalizedStartDate) {
    return { isValid: false, error: 'Invalid date format provided' };
  }
  
  const startParts = normalizedStartDate.split('-');
  const startDateObj = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
  if (startDateObj <= sixtyDaysFromNow) {
    return { isValid: true };
  }

  // Count user's existing future special-date bookings >60 days away
  const existingFutureBookings = await Booking.find({
    user: userId,
    status: { $ne: 'cancelled' },
    startDate: { $gt: sixtyDaysFromNow }
  });

  const counts = { type1: 0, type2: 0 };
  for (const b of existingFutureBookings) {
    const types = await getOverlappingSpecialDateTypes(b.startDate, b.endDate);
    const uniqueTypes = new Set(types);
    if (uniqueTypes.has('type1')) counts.type1 += 1;
    if (uniqueTypes.has('type2')) counts.type2 += 1;
  }

  if (overlappingTypes.includes('type1') && counts.type1 >= 1) {
    return { isValid: false, error: 'You already have an active Type 1 special date booking more than 60 days away.' };
  }
  if (overlappingTypes.includes('type2') && counts.type2 >= 1) {
    return { isValid: false, error: 'You already have an active Type 2 special date booking more than 60 days away.' };
  }

  return { isValid: true };
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res) => {
  try {
    // Add filtering capabilities
    let query = {};
    
    // Filter by user if specified
    if (req.query.user) {
      query.user = req.query.user;
    }
    
    // Filter by asset if specified
    if (req.query.asset) {
      query.asset = req.query.asset;
    }
    
    // Filter by status if specified
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by date range if specified
    if (req.query.startDate && req.query.endDate) {
      let rangeStart;
      let rangeEnd;
      try {
        rangeStart = DateUtils.parseApiDate(req.query.startDate);
        rangeEnd = DateUtils.parseApiDate(req.query.endDate);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid startDate/endDate query format. Expected YYYY-MM-DD.'
        });
      }
      query.$or = [
        // Bookings that start within the range
        { 
          startDate: { 
            $gte: rangeStart, 
            $lte: rangeEnd 
          } 
        },
        // Bookings that end within the range
        { 
          endDate: { 
            $gte: rangeStart, 
            $lte: rangeEnd 
          } 
        },
        // Bookings that span the entire range
        {
          startDate: { $lte: rangeStart },
          endDate: { $gte: rangeEnd }
        }
      ];
    }
    
    const bookings = await Booking.find(query)
      .populate('user', 'name lastName email')
      .populate('asset', 'name location locationAddress propertyManager type description capacity amenities photos');
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings.map(formatBookingForResponse)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name lastName email')
      .populate('asset', 'name location locationAddress propertyManager type description capacity amenities photos');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: formatBookingForResponse(booking)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    // FEAT-ADMIN-OVR-001: Admin override logic
    const isAdmin = req.user.role === 'admin';
    const { adminOverride, overrideNote } = req.body;
    const violations = []; // Collect validation violations for admin override
    
    // Get user ID from the authenticated user or admin override
    const userId = req.body.userId && isAdmin ? req.body.userId : req.user.id;
    const isAdminBookingForAnotherUser = isAdmin && String(userId) !== String(req.user.id);
    const { assetId, startDate: startDateStr, endDate: endDateStr, notes, useExtraDays } = req.body;
    
    // DEBUG: Log incoming request data
    console.log('🔵 CREATE BOOKING REQUEST:', {
      assetId,
      startDateStr,
      endDateStr,
      userId,
      requestBody: req.body
    });
    
    // Convert date strings to Date objects with proper timezone handling using DateUtils
    const startDate = DateUtils.parseApiDate(startDateStr);
    const endDate = DateUtils.parseApiDate(endDateStr);
    
    console.log('🔵 PARSED DATES:', {
      startDate,
      endDate,
      diff: endDate - startDate,
      startISO: startDate.toISOString(),
      endISO: endDate.toISOString()
    });
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    // Check if user owns shares in this asset
    const userOwnership = asset.owners.find(owner => 
      owner.user.toString() === userId.toString()
    );
    
    if (!userOwnership) {
      return res.status(403).json({
        success: false,
        error: 'User must own shares in this asset to book it'
      });
    }
    
    const sharePercentage = userOwnership.sharePercentage;
    
    // Validate booking timeframe (BUSINESS RULE - can be overridden by admin)
    const timeframeValidation = await validateBookingTimeframe(startDate, endDate, assetId, sharePercentage);
    if (!timeframeValidation.isValid) {
      if (isAdmin) {
        violations.push(timeframeValidation.error);
      } else {
        return res.status(400).json({
          success: false,
          error: timeframeValidation.error
        });
      }
    }
    
    // Check for booking overlaps
    const overlapCheck = await checkBookingOverlap(userId, assetId, startDateStr, endDateStr);
    if (overlapCheck.hasOverlap) {
      const overlappingBooking = overlapCheck.overlappingBookings[0];
      const overlapStart = overlappingBooking.startDate.toISOString().split('T')[0];
      const overlapEnd = overlappingBooking.endDate.toISOString().split('T')[0];
      return res.status(400).json({
        success: false,
        error: `This booking overlaps with your existing booking from ${overlapStart} to ${overlapEnd}. Please choose different dates.`
      });
    }
    
    // FEAT-ADMIN-BLOCK-001: Check for blocked date overlaps
    const BlockedDate = require('../models/BlockedDate');
    const blockedDateOverlaps = await BlockedDate.find({
      asset: assetId,
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    });
    
    if (blockedDateOverlaps.length > 0) {
      const block = blockedDateOverlaps[0];
      const blockError = `These dates are blocked for ${block.blockType}${block.reason ? ': ' + block.reason : ''}. Please choose different dates.`;
      
      // Admin can override blocked dates (treat as violation)
      if (isAdmin && adminOverride) {
        violations.push(blockError);
      } else if (isAdmin) {
        // Admin without override flag - inform them they can override
        violations.push(blockError);
      } else {
        // Regular users cannot book over blocked dates
        return res.status(400).json({
          success: false,
          error: blockError
        });
      }
    }
    
    // Check if this is a short-term booking
    const shortTermResult = await isShortTermBooking(assetId, startDate);
    const isShortTerm = shortTermResult.isShortTerm;
    const isVeryShortTerm = shortTermResult.isVeryShortTerm;
    
    // Apply gap rule for non–short-term bookings
    // Also apply gap rule for bookings that overlap special dates, regardless of short-term window
    const overlappingTypesForGap = await getOverlappingSpecialDateTypes(startDate, endDate);
    
    if (!isShortTerm || overlappingTypesForGap.length > 0) {
      const gapValidation = await calculateBookingGap(userId, assetId, startDate, endDate);
      
      // Check gap requirement from previous booking (BUSINESS RULE - can be overridden)
      if (gapValidation.minGapResult.hasMinGapConstraint && gapValidation.minGapResult.daysBetweenBookings < gapValidation.minGapResult.minimumGap) {
        const nextAvailableDate = gapValidation.minGapResult.lastBookingEndDate 
          ? new Date(gapValidation.minGapResult.lastBookingEndDate.getTime() + gapValidation.minGapResult.minimumGap * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : 'immediately';
        
        const gapError = `You must wait at least ${gapValidation.minGapResult.minimumGap} days between bookings (based on your last stay duration). Your next available booking date is ${nextAvailableDate}.`;
        if (isAdmin) {
          violations.push(gapError);
        } else {
          return res.status(400).json({
            success: false,
            error: gapError
          });
        }
      }
      
      // Check gap requirement for next booking (BUSINESS RULE - can be overridden)
      if (gapValidation.nextGapResult.hasMinGapConstraint && gapValidation.nextGapResult.daysBetweenBookings < gapValidation.nextGapResult.minimumGap) {
        const nextBookingStart = gapValidation.nextGapResult.nextBookingStartDate.toISOString().split('T')[0];
        const requiredEndDate = new Date(gapValidation.nextGapResult.nextBookingStartDate.getTime() - gapValidation.nextGapResult.minimumGap * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const nextGapError = `This booking must end at least ${gapValidation.nextGapResult.minimumGap} days before your next booking starting ${nextBookingStart}. Your booking must end by ${requiredEndDate}.`;
        if (isAdmin) {
          violations.push(nextGapError);
        } else {
          return res.status(400).json({
            success: false,
            error: nextGapError
          });
        }
      }

      // Enforce special date cap: when booking > 60 days in advance, allow only one active Type1 and one active Type2 across all assets
      const overlappingTypes = await getOverlappingSpecialDateTypes(startDate, endDate);
      if (overlappingTypes.length > 0) {
        const now = new Date();
        const sixtyDaysFromNow = new Date(now.getTime() + SHORT_TERM_MAX_DAYS * 24 * 60 * 60 * 1000);
        // Only enforce if the new booking starts beyond 60 days
        if (startDate > sixtyDaysFromNow) {
          // Get the year of the new booking
          const bookingYear = startDate.getFullYear();
          const yearStart = new Date(bookingYear, 0, 1); // January 1st of the booking year
          const yearEnd = new Date(bookingYear, 11, 31); // December 31st of the booking year
          
          const existingFutureBookings = await Booking.find({
            user: userId,
            asset: assetId, // Only check bookings for the specific asset
            status: { $ne: 'cancelled' },
            startDate: { 
              $gte: yearStart, // Start within the booking year
              $lte: yearEnd 
            }
          });
          // Count user's existing future special-date bookings beyond 60 days
          const counts = { type1: 0, type2: 0 };
          for (const b of existingFutureBookings) {
            if (b.startDate <= sixtyDaysFromNow) continue; // restriction lifts within 60 days
            // Count bookings that have specialDateType set directly
            if (b.specialDateType === 'type1') counts.type1 += 1;
            else if (b.specialDateType === 'type2') counts.type2 += 1;
          }
          // Calculate allowed special dates based on share percentage
          const eighthShares = Math.floor(sharePercentage / 12.5);
          const allowedType1 = eighthShares;
          const allowedType2 = eighthShares;
          
          if (overlappingTypes.includes('type1') && counts.type1 >= allowedType1) {
            const specialDateError = `You already have ${counts.type1} active Type 1 special date booking(s) more than 60 days away. You may book another Type 1 once you are within 60 days of your existing special date.`;
            if (isAdmin) {
              violations.push(specialDateError);
            } else {
              return res.status(400).json({ success: false, error: specialDateError });
            }
          }
          if (overlappingTypes.includes('type2') && counts.type2 >= allowedType2) {
            const specialDateError = `You already have ${counts.type2} active Type 2 special date booking(s) more than 60 days away. You may book another Type 2 once you are within 60 days of your existing special date.`;
            if (isAdmin) {
              violations.push(specialDateError);
            } else {
              return res.status(400).json({ success: false, error: specialDateError });
            }
          }
        }
      }
    }
    
    // Calculate booking duration in days
    const bookingDays = calculateBookingDays(startDate, endDate);
    
    // Calculate allowed days per year based on share percentage
    const allowedDaysPerYear = calculateAllowedDays(sharePercentage);
    
    // Calculate max active bookings allowed based on share percentage
    const maxActiveBookings = calculateMaxActiveBookings(sharePercentage);

    // Resolve allocation window from anniversary anchor (source of truth).
    // Extra days are only consumed for overflow beyond standard allocation.
    const relevantWindow = getOwnerAllocationWindowForDate(userOwnership, startDate);
    const relevantWindowLabel = `${relevantWindow.windowStartStr} to ${relevantWindow.windowEndStr}`;

    const existingBookingsInWindow = await Booking.find({
      user: userId,
      asset: assetId,
      $or: [
        { status: { $ne: 'cancelled' } },
        { status: 'cancelled', shortTermCancelled: true }
      ],
      startDate: { $gte: relevantWindow.windowStart },
      endDate: { $lte: relevantWindow.windowEnd }
    });

    const standardDaysBookedInWindow = existingBookingsInWindow
      .filter(booking => !booking.isExtraDays)
      .reduce((total, booking) => {
        if (booking.status === 'cancelled' && booking.shortTermCancelled) {
          return total + (booking.remainingPenaltyDays || calculateBookingDays(booking.startDate, booking.endDate));
        }
        return total + calculateBookingDays(booking.startDate, booking.endDate);
      }, 0);

    const extraDaysUsedInWindow = existingBookingsInWindow
      .filter(booking => booking.isExtraDays)
      .reduce((total, booking) => {
        if (typeof booking.extraDayCount === 'number' && booking.extraDayCount > 0) {
          return total + booking.extraDayCount;
        }
        // Backward-compat for legacy rows where extraDayCount was not populated correctly.
        return total + calculateBookingDays(booking.startDate, booking.endDate);
      }, 0);

    // For very short-term bookings (<=7 days), only the overflow beyond standard allocation
    // should be marked as extra days.
    let isExtraDays = false;
    let extraDayCount = 0;
    let extraDayCost = 0;
    
    if (isVeryShortTerm) {
      // Calculate extra allowed days
      const extraAllowedDays = calculateExtraAllowedDays(sharePercentage);

      const standardDaysRemaining = Math.max(0, allowedDaysPerYear - standardDaysBookedInWindow);
      const extraDaysNeeded = Math.max(0, bookingDays - standardDaysRemaining);

      // Check if user has enough extra days available
      if (extraDaysUsedInWindow + extraDaysNeeded > extraAllowedDays) {
        return res.status(400).json({
          success: false,
          error: `This very short-term booking would exceed your extra days allocation. You have used ${extraDaysUsedInWindow} of your ${extraAllowedDays} extra days in this allocation window.`,
          extraDaysNeeded,
          extraDaysAvailable: extraAllowedDays - extraDaysUsedInWindow,
          costEstimate: extraDaysNeeded * EXTRA_DAY_COST
        });
      }
      
      // Extra days only for the overflow portion.
      isExtraDays = extraDaysNeeded > 0;
      extraDayCount = extraDaysNeeded;
      extraDayCost = extraDaysNeeded * EXTRA_DAY_COST;
    }
    
    // Only check booking limits if not a short-term booking
    if (!isShortTerm) {
      // Count user's current active bookings for this asset in the effective anniversary window
      const bookingYear = startDate.getFullYear();
      const currentActiveBookings = await countActiveBookings(userId, assetId, bookingYear, {
        windowStart: relevantWindow.windowStart,
        windowEnd: relevantWindow.windowEnd,
        assetType: asset.type,
        shortTermMaxDays: getShortTermThresholdDaysByAssetType(asset.type)
      });
      
      // Check if user has reached their maximum number of active bookings (BUSINESS RULE - can be overridden)
      if (currentActiveBookings >= maxActiveBookings) {
        const activeBookingsError = `You already have ${currentActiveBookings} active bookings. Maximum allowed for your share (${sharePercentage}%) is ${maxActiveBookings}.`;
        if (isAdmin) {
          violations.push(activeBookingsError);
        } else {
          return res.status(400).json({
            success: false,
            error: activeBookingsError
          });
        }
      }
      
      // Check how many "booking slots" this reservation will use (BUSINESS RULE - can be overridden)
      // If booking exceeds STANDARD_BOOKING_LENGTH, it counts as multiple bookings
      const bookingSlotsRequired = Math.ceil(bookingDays / STANDARD_BOOKING_LENGTH);
      
      // Check if this would exceed the maximum allowed bookings
      if (currentActiveBookings + bookingSlotsRequired > maxActiveBookings) {
        const bookingSlotsError = `This booking would require ${bookingSlotsRequired} booking slots. You have ${currentActiveBookings} active bookings and maximum allowed is ${maxActiveBookings}.`;
        if (isAdmin) {
          violations.push(bookingSlotsError);
        } else {
          return res.status(400).json({
            success: false,
            error: bookingSlotsError
          });
        }
      }
      
      // Use precomputed allocation usage for this booking's anniversary window.
      const daysBooked = standardDaysBookedInWindow;
      
      // Compute number of days of this booking that fall within the allocation window
      let daysInAllocationWindow = 0;
      const overlapStart = new Date(Math.max(relevantWindow.windowStart.getTime(), startDate.getTime()));
      const overlapEnd = new Date(Math.min(relevantWindow.windowEnd.getTime(), endDate.getTime()));
      if (overlapEnd >= overlapStart) {
        daysInAllocationWindow = calculateBookingDays(overlapStart, overlapEnd);
      }
      
      // Calculate standard and extra day allocation
      const extraAllowedDays = calculateExtraAllowedDays(sharePercentage);
      
      // Calculate used extra days
      const extraDaysUsed = extraDaysUsedInWindow;
      
      // Check if the new booking would exceed the user's standard allocation (BUSINESS RULE - can be overridden)
      if (daysBooked + daysInAllocationWindow > allowedDaysPerYear) {
        // If exceeding standard allocation, check if user wants to use extra days
        if (useExtraDays) {
          // Calculate how many extra days would be needed
          const standardDaysRemaining = Math.max(0, allowedDaysPerYear - daysBooked);
          const extraDaysNeeded = daysInAllocationWindow - standardDaysRemaining;
          
          // Check if user has enough extra days available
          if (extraDaysUsed + extraDaysNeeded > extraAllowedDays) {
            const extraDaysError = `This booking would exceed your extra days allocation. You have used ${extraDaysUsed} of your ${extraAllowedDays} extra days in the allocation window ${relevantWindowLabel}.`;
            if (isAdmin) {
              violations.push(extraDaysError);
            } else {
              return res.status(400).json({
                success: false,
                error: extraDaysError,
                extraDaysNeeded,
                extraDaysAvailable: extraAllowedDays - extraDaysUsed,
                costEstimate: extraDaysNeeded * EXTRA_DAY_COST
              });
            }
          }
          
          // Calculate cost for the extra days
          const extraDayCost = extraDaysNeeded * EXTRA_DAY_COST;
          
          // Flag to mark this booking uses extra days
          const isExtraDays = extraDaysNeeded > 0;
          const extraDayCount = extraDaysNeeded;
          
          // If we've reached this point, the booking can be created using extra days
          // Proceed with creating the booking, but set the isExtraDays flag
          // ... existing booking creation code ...
          
          // If the booking exceeds STANDARD_BOOKING_LENGTH, split it into multiple bookings
          let bookingsToCreate = [];
  
          if (bookingDays <= STANDARD_BOOKING_LENGTH) {
            // Single booking
            bookingsToCreate.push({
              user: userId,
              asset: assetId,
              startDate: startDate,
              endDate: endDate,
              status: 'confirmed',
              notes: notes || '',
              isShortTerm,
              isVeryShortTerm,
              specialDateType,
              year: bookingYear,
              isExtraDays,
              extraDayCount,
              extraDayCost,
              // FEAT-ADMIN-OVR-001: Admin override metadata
              adminOverride: isAdmin && violations.length > 0,
              overrideByAdminId: (isAdmin && violations.length > 0) ? req.user.id : null,
              overrideAt: (isAdmin && violations.length > 0) ? new Date() : null,
              overrideReasons: violations,
              overrideNote: overrideNote || null
            });
          } else {
            // For split bookings with extra days, we need to determine which segments use extra days
            // Typically, the extra days would be applied to the later segments
            
            // Split into multiple bookings of STANDARD_BOOKING_LENGTH days
            let currentStart = new Date(startDate);
            let remainingExtraDays = extraDayCount;
            let daysUsedFromStandardAllocation = 0;
            
            while (currentStart < endDate) {
              let currentEnd = new Date(currentStart);
              currentEnd.setDate(currentEnd.getDate() + STANDARD_BOOKING_LENGTH - 1);
              
              // Ensure we don't exceed the original end date
              if (currentEnd > endDate) {
                currentEnd = new Date(endDate);
              }
              
              // Calculate days in this segment
              const segmentDays = calculateBookingDays(currentStart, currentEnd);
              
              // Check if this segment uses any extra days
              const segmentExtraDays = Math.max(0, Math.min(
                segmentDays,
                remainingExtraDays
              ));
              
              const segmentIsExtraDays = segmentExtraDays > 0;
              const segmentExtraCost = segmentExtraDays * EXTRA_DAY_COST;
              
              // Re-check special dates for each segment
              // ... existing special date check code ...
              
              bookingsToCreate.push({
                user: userId,
                asset: assetId,
                startDate: new Date(currentStart),
                endDate: new Date(currentEnd),
                status: 'confirmed',
                notes: notes || '',
                isShortTerm,
                isVeryShortTerm,
                specialDateType: segmentSpecialDateType,
                year: segmentYear,
                isExtraDays: segmentIsExtraDays,
                extraDayCount: segmentExtraDays,
                extraDayCost: segmentExtraCost,
                // FEAT-ADMIN-OVR-001: Admin override metadata
                adminOverride: isAdmin && violations.length > 0,
                overrideByAdminId: (isAdmin && violations.length > 0) ? req.user.id : null,
                overrideAt: (isAdmin && violations.length > 0) ? new Date() : null,
                overrideReasons: violations,
                overrideNote: overrideNote || null
              });
              
              // Update remaining extra days
              remainingExtraDays -= segmentExtraDays;
              
              // Move to next period
              currentStart.setDate(currentStart.getDate() + STANDARD_BOOKING_LENGTH);
            }
          }
          
          // Create all the bookings
          const createdBookings = await Booking.insertMany(bookingsToCreate);

          await trySendBookingConfirmationEmail({
            user,
            asset,
            bookings: createdBookings,
            createdByAdmin: isAdminBookingForAnotherUser
          });
          
          // Include extra day information in response
          return res.status(201).json({
            success: true,
            data: {
              bookings: createdBookings.map(formatBookingForResponse),
              bookingCount: createdBookings.length,
              isShortTerm,
              isVeryShortTerm,
              isExtraDays,
              extraDayCount,
              extraDayCost,
              reassignedBookings,
              message: `Booking created successfully using ${extraDayCount} extra days at a cost of ${extraDayCost}.${createdBookings.length > 1 ? ` Your reservation was split into ${createdBookings.length} bookings.` : ''}`
            }
          });
        } else {
          // User does not want to use extra days (BUSINESS RULE - can be overridden)
          const allocationError = `Booking exceeds your allocation. You have used ${daysBooked} of ${allowedDaysPerYear} days in the allocation window ${relevantWindowLabel}.`;
          if (isAdmin) {
            violations.push(allocationError);
          } else {
            return res.status(400).json({
              success: false,
              error: allocationError,
              canUseExtraDays: true,
              extraDaysAvailable: extraAllowedDays - extraDaysUsed,
              standardDaysRemaining: allowedDaysPerYear - daysBooked,
              extraDaysNeeded: Math.max(0, daysInAllocationWindow - (allowedDaysPerYear - daysBooked)),
              costEstimate: Math.max(0, daysInAllocationWindow - (allowedDaysPerYear - daysBooked)) * EXTRA_DAY_COST
            });
          }
        }
      }
      
      // Special date validation is now handled above in the overlapping types check
    }
    
    // FEAT-ADMIN-OVR-001: Check if there are violations and admin hasn't confirmed override
    if (violations.length > 0) {
      if (isAdmin && !adminOverride) {
        // Return violations to admin for confirmation
        return res.status(400).json({
          success: false,
          requiresOverride: true,
          violations,
          message: 'This booking violates rules. You can proceed with admin override.'
        });
      }
      // If we reach here, admin has confirmed override (adminOverride === true)
      // Proceed with booking creation and store override metadata
    }
    
    // If this is a short-term booking, check if it can reassign any cancelled short-term bookings
    let reassignedBookings = 0;
    if (isShortTerm) {
      reassignedBookings = await reassignCancelledShortTermBooking(userId, assetId, startDate, endDate);
    }
    
    // Determine if booking overlaps with special dates for record-keeping
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];
    
    let specialDateType = null;
    let bookingYear = startDate.getFullYear();
    
    // Check for special date overlap regardless of short-term status (just for record keeping)
    // Check both universal (asset: null) AND asset-specific special dates
    const specialDates = await SpecialDate.find({
      $or: [
        { asset: null },  // Universal special dates
        { asset: assetId } // Asset-specific special dates
      ]
    });
    
    specialDates.forEach(specialDate => {
      const specialStart = new Date(specialDate.startDate);
      const specialEnd = new Date(specialDate.endDate);
      
      // Check for overlap (RULE-HOME-017 / RULE-BOAT-017)
      // A booking is special if AT LEAST ONE DAY overlaps
      if (startDate <= specialEnd && endDate >= specialStart) {
        // Priority: type1 takes precedence over type2 if both overlap
        if (specialDateType !== 'type1') {
          specialDateType = specialDate.type;
        }
        // Use the booking start year as the year for tracking
        bookingYear = startDate.getFullYear();
      }
    });
    
    console.log('🔍 Special date check:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      specialDateType,
      bookingYear,
      specialDatesChecked: specialDates.length
    });
    
    // If the booking exceeds STANDARD_BOOKING_LENGTH, split it into multiple bookings
    let bookingsToCreate = [];
    
    if (bookingDays <= STANDARD_BOOKING_LENGTH) {
      // Single booking
      bookingsToCreate.push({
        user: userId,
        asset: assetId,
        startDate: startDate,
        endDate: endDate,
        status: 'confirmed',
        notes: notes || '',
        isShortTerm,
        isVeryShortTerm,
        specialDateType,
        year: startDate.getFullYear(),
        isExtraDays,
        extraDayCount,
        extraDayCost,
        // FEAT-ADMIN-OVR-001: Admin override metadata
        adminOverride: isAdmin && violations.length > 0,
        overrideByAdminId: (isAdmin && violations.length > 0) ? req.user.id : null,
        overrideAt: (isAdmin && violations.length > 0) ? new Date() : null,
        overrideReasons: violations,
        overrideNote: overrideNote || null
      });
    } else {
      // Split into multiple bookings of STANDARD_BOOKING_LENGTH days
      let currentStart = new Date(startDate);
      let remainingExtraDays = extraDayCount;
      
      while (currentStart < endDate) {
        let currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + STANDARD_BOOKING_LENGTH - 1);
        
        // Ensure we don't exceed the original end date
        if (currentEnd > endDate) {
          currentEnd = new Date(endDate);
        }
        
        // Check if this segment overlaps with special dates
        let segmentSpecialDateType = null;
        let segmentYear = currentStart.getFullYear();
        
        // Re-check special dates for each segment
        specialDates.forEach(specialDate => {
          const specialStart = new Date(specialDate.startDate);
          const specialEnd = new Date(specialDate.endDate);
          
          // Check for overlap with this segment (RULE-HOME-017 / RULE-BOAT-017)
          if (currentStart <= specialEnd && currentEnd >= specialStart) {
            // Priority: type1 takes precedence over type2 if both overlap
            if (segmentSpecialDateType !== 'type1') {
              segmentSpecialDateType = specialDate.type;
            }
            segmentYear = currentStart.getFullYear();
          }
        });
        
        // Calculate days in this segment
        const segmentDays = calculateBookingDays(currentStart, currentEnd);
        
        // Apply extra days only to the overflow portion of this booking.
        const segmentExtraDayCount = Math.max(0, Math.min(segmentDays, remainingExtraDays));
        const segmentIsExtraDays = segmentExtraDayCount > 0;
        const segmentExtraDayCost = segmentExtraDayCount * EXTRA_DAY_COST;
        
        bookingsToCreate.push({
          user: userId,
          asset: assetId,
          startDate: new Date(currentStart),
          endDate: new Date(currentEnd),
          status: 'confirmed',
          notes: notes || '',
          isShortTerm,
          isVeryShortTerm,
          specialDateType: segmentSpecialDateType,
          year: segmentYear,
          isExtraDays: segmentIsExtraDays,
          extraDayCount: segmentExtraDayCount,
          extraDayCost: segmentExtraDayCost,
          // FEAT-ADMIN-OVR-001: Admin override metadata
          adminOverride: isAdmin && violations.length > 0,
          overrideByAdminId: (isAdmin && violations.length > 0) ? req.user.id : null,
          overrideAt: (isAdmin && violations.length > 0) ? new Date() : null,
          overrideReasons: violations,
          overrideNote: overrideNote || null
        });
        
        remainingExtraDays -= segmentExtraDayCount;

        // Move to next period
        currentStart.setDate(currentStart.getDate() + STANDARD_BOOKING_LENGTH);
      }
    }
    
    // Create all the bookings
    const createdBookings = await Booking.insertMany(bookingsToCreate);

    await trySendBookingConfirmationEmail({
      user,
      asset,
      bookings: createdBookings,
      createdByAdmin: isAdminBookingForAnotherUser
    });
    
    // Log special date bookings for debugging
    const specialDateBookings = createdBookings.filter(b => b.specialDateType);
    if (specialDateBookings.length > 0) {
      console.log('✅ Created bookings with special dates:', 
        specialDateBookings.map(b => ({
          id: b._id,
          startDate: b.startDate.toISOString().split('T')[0],
          endDate: b.endDate.toISOString().split('T')[0],
          specialDateType: b.specialDateType,
          bookingType: b.isVeryShortTerm ? 'Very Short Term' : b.isShortTerm ? 'Short Term' : 'Long Term'
        }))
      );
    }
    
    res.status(201).json({
      success: true,
      data: {
        bookings: createdBookings.map(formatBookingForResponse),
        bookingCount: createdBookings.length,
        isShortTerm,
        isVeryShortTerm,
        reassignedBookings,
        message: isShortTerm ? 
          `Short-term booking created successfully${reassignedBookings > 0 ? `. ${reassignedBookings} cancelled booking(s) were reassigned.` : ''}` : 
          (createdBookings.length > 1 ? 
            `Your reservation was split into ${createdBookings.length} bookings because it exceeds ${STANDARD_BOOKING_LENGTH} days` : 
            'Booking created successfully')
      }
    });
  } catch (err) {
    console.error('❌ Booking creation error for 1-day booking debug:', {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack
    });
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      console.error('🔴 Validation errors:', messages);
      
      return res.status(400).json({
        success: false,
        error: messages[0] || messages
      });
    } else {
      console.error('🔴 Non-validation error:', err.message);
      res.status(400).json({
        success: false,
        error: err.message || 'Server Error'
      });
    }
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
exports.updateBooking = async (req, res) => {
  try {
    let booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // If dates are being modified, we need to check for overlap and allocation
    if (req.body.startDate || req.body.endDate) {
      // Normalize dates to YYYY-MM-DD format first, then parse components
      let startDate, endDate;
      if (req.body.startDate) {
        const normalizedStartDate = normalizeDateString(req.body.startDate);
        if (!normalizedStartDate) {
          return res.status(400).json({
            success: false,
            error: 'Invalid start date format'
          });
        }
        const startParts = normalizedStartDate.split('-');
        startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
      } else {
        startDate = booking.startDate;
      }
      if (req.body.endDate) {
        const normalizedEndDate = normalizeDateString(req.body.endDate);
        if (!normalizedEndDate) {
          return res.status(400).json({
            success: false,
            error: 'Invalid end date format'
          });
        }
        const endParts = normalizedEndDate.split('-');
        endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
      } else {
        endDate = booking.endDate;
      }
      
      // Calculate new booking duration
      const newBookingDays = calculateBookingDays(startDate, endDate);
      const oldBookingDays = calculateBookingDays(booking.startDate, booking.endDate);
      
      // Only check allocation if booking will be longer
      if (newBookingDays > oldBookingDays) {
        // Get user's ownership
        const asset = await Asset.findById(booking.asset);
        const userOwnership = asset.owners.find(owner => 
          owner.user.toString() === booking.user.toString()
        );
        if (!userOwnership) {
          return res.status(403).json({ success: false, error: 'User no longer owns shares in this asset' });
        }

        // Allowed days and anniversary-scoped allocation window
        const sharePercentage = userOwnership.sharePercentage;
        // Enforce dynamic maximum consecutive stay based on ownership share
        const maxConsecutiveDays = calculateMaxConsecutiveDays(sharePercentage);
        if (newBookingDays > maxConsecutiveDays) {
          return res.status(400).json({
            success: false,
            error: `A continuous stay cannot exceed ${maxConsecutiveDays} days for your ownership share`
          });
        }
        const allowedDaysPerYear = calculateAllowedDays(sharePercentage);
        
        const relevantWindow = getOwnerAllocationWindowForDate(userOwnership, startDate);
        const relevantWindowLabel = `${relevantWindow.windowStartStr} to ${relevantWindow.windowEndStr}`;

        // Existing bookings in window excluding this one
        const existingBookings = await Booking.find({
          user: booking.user,
          asset: booking.asset,
          status: { $ne: 'cancelled' },
          startDate: { $gte: relevantWindow.windowStart },
          endDate: { $lte: relevantWindow.windowEnd },
          _id: { $ne: booking._id }
        });
        const daysBooked = existingBookings.reduce((total, b) => total + calculateBookingDays(b.startDate, b.endDate), 0);

        // Compute overlap deltas within window for old vs new booking
        const overlap = (s, e) => {
          const os = new Date(Math.max(relevantWindow.windowStart.getTime(), s.getTime()));
          const oe = new Date(Math.min(relevantWindow.windowEnd.getTime(), e.getTime()));
          if (oe < os) return 0;
          return calculateBookingDays(os, oe);
        };
        const oldOverlap = overlap(booking.startDate, booking.endDate);
        const newOverlap = overlap(startDate, endDate);
        const additionalOverlap = Math.max(0, newOverlap - oldOverlap);

        if (daysBooked + additionalOverlap > allowedDaysPerYear) {
          return res.status(400).json({
            success: false,
            error: `Booking update exceeds your allocation window. You have used ${daysBooked} of ${allowedDaysPerYear} days in ${relevantWindowLabel}.`
          });
        }
      }
    }

    const wasCancelled = booking.status === 'cancelled';
    const updatePayload = { ...req.body };
    if (!wasCancelled && updatePayload.status === 'cancelled' && !updatePayload.cancelledAt) {
      updatePayload.cancelledAt = new Date();
    }

    // Update the booking
    booking = await Booking.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true
    });

    if (!wasCancelled && booking.status === 'cancelled') {
      const [bookingUser, bookingAsset] = await Promise.all([
        User.findById(booking.user).select('name lastName email'),
        Asset.findById(booking.asset).select('name')
      ]);

      const cancelledByAdmin = req.user.role === 'admin' && String(booking.user) !== String(req.user.id);
      await trySendBookingCancellationEmail({
        user: bookingUser,
        asset: bookingAsset,
        booking,
        cancelledByAdmin
      });
    }
    
    res.status(200).json({
      success: true,
      data: formatBookingForResponse(booking)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name lastName email')
      .populate('asset', 'name');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // FEAT-CANCEL-PENALTY-001: Cancellation penalty with partial refund
    // When a booking is cancelled within the short-term threshold (<=60 days for homes, <=30 for boats),
    // the entire booking duration counts as "used" initially (penalty).
    // EXCEPTION: If another co-owner books overlapping dates on the SAME asset, those overlapping
    // days are immediately refunded (credited back). Partial overlaps yield partial refunds.
    // Policy decisions: PD-CANCEL-001 through PD-CANCEL-004 (see PRD.md)
    // Domain rules: RULE-HOME-021 (homes) and RULE-BOAT-021 (boats)
    const cancelledByAdmin = req.user.role === 'admin' && String(booking.user?._id || booking.user) !== String(req.user.id);

    if (booking.isShortTerm) {
      // Calculate original booking days (inclusive-inclusive date range)
      const originalDays = Math.ceil((booking.endDate - booking.startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // Mark the booking as cancelled
      booking.status = 'cancelled';
      
      // Add a flag to indicate this is a short-term cancellation that still counts against allocation
      booking.shortTermCancelled = true;
      
      // Set cancellation date and tracking fields for penalty and refund management
      booking.cancelledAt = new Date();
      booking.originalDays = originalDays;  // Total days in original booking
      booking.rebookedDays = 0;  // Days that have been rebooked by others (starts at 0)
      booking.remainingPenaltyDays = originalDays;  // Days still counting as used (starts at full duration)
      
      await booking.save();
      await trySendBookingCancellationEmail({
        user: booking.user,
        asset: booking.asset,
        booking,
        cancelledByAdmin
      });
      
      // Optional: Notify other owners that these dates are available for short-term booking
      
      return res.status(200).json({
        success: true,
        message: 'Short-term booking cancelled. These days will count against your allocation unless you or another owner books these dates.',
        data: formatBookingForResponse(booking)
      });
    } else {
      // For long-term bookings, just mark as cancelled and don't count against allocation
      booking.status = 'cancelled';
      booking.cancelledAt = new Date();
      await booking.save();
      await trySendBookingCancellationEmail({
        user: booking.user,
        asset: booking.asset,
        booking,
        cancelledByAdmin
      });
      
      return res.status(200).json({
        success: true,
        message: 'Booking cancelled successfully.',
        data: formatBookingForResponse(booking)
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get in-app alerts for recently freed booking dates
// @route   GET /api/bookings/alerts/freed-dates
// @access  Private
exports.getFreedDateAlerts = async (req, res) => {
  try {
    const requesterId = req.user?._id || req.user?.id;
    if (!requesterId) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this resource'
      });
    }

    const requestedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
    const candidateLimit = Math.max(limit * 10, 100);

    const now = new Date();
    const alertsCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const todayUtc = DateUtils.toDate(DateUtils.normalize(now));

    const ownedAssets = await Asset.find({ 'owners.user': requesterId })
      .select('_id name type location')
      .lean();

    if (!ownedAssets.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const ownedAssetIds = ownedAssets.map((asset) => asset._id);
    const ownedAssetMap = new Map(ownedAssets.map((asset) => [String(asset._id), asset]));

    const cancelledCandidates = await Booking.find({
      status: 'cancelled',
      asset: { $in: ownedAssetIds },
      user: { $ne: requesterId },
      cancelledAt: { $gte: alertsCutoff },
      endDate: { $gte: todayUtc }
    })
      .select('_id user asset startDate endDate cancelledAt')
      .populate('user', 'name lastName')
      .populate('asset', '_id name type location')
      .sort({ cancelledAt: -1 })
      .limit(candidateLimit)
      .lean();

    const alerts = [];
    for (const cancelledBooking of cancelledCandidates) {
      if (!cancelledBooking?.asset || !cancelledBooking?.cancelledAt) continue;

      const assetId = cancelledBooking.asset._id || cancelledBooking.asset;
      const hasOverlap = await Booking.findOne({
        _id: { $ne: cancelledBooking._id },
        asset: assetId,
        status: { $ne: 'cancelled' },
        startDate: { $lte: cancelledBooking.endDate },
        endDate: { $gte: cancelledBooking.startDate }
      })
        .select('_id')
        .lean();

      // Product rule: hide alert as soon as any overlap gets rebooked.
      if (hasOverlap) continue;

      const assetFromOwnerMap = ownedAssetMap.get(String(assetId));
      const asset = assetFromOwnerMap || cancelledBooking.asset;
      const cancelledBy = cancelledBooking.user || {};

      alerts.push({
        alertId: `booking_${cancelledBooking._id}`,
        bookingId: cancelledBooking._id,
        asset: {
          _id: asset._id || assetId,
          name: asset.name || '',
          type: asset.type || '',
          location: asset.location || ''
        },
        cancelledBy: {
          _id: cancelledBy._id || null,
          name: cancelledBy.name || '',
          lastName: cancelledBy.lastName || ''
        },
        startDate: DateUtils.formatForApi(cancelledBooking.startDate),
        endDate: DateUtils.formatForApi(cancelledBooking.endDate),
        cancelledAt: new Date(cancelledBooking.cancelledAt).toISOString()
      });

      if (alerts.length >= limit) break;
    }

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};

// @desc    Get available dates for an asset
// @route   GET /api/bookings/availability/:assetId
// @access  Public
exports.getAvailability = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { startDate, endDate } = req.query;
    const measureDb = async (operation) => {
      const startedAt = Date.now();
      const result = await operation();
      req.perf?.add('dbRead', Date.now() - startedAt);
      return result;
    };
    
    // Default to current month if dates not provided
    let start, end;
    if (startDate) {
      start = DateUtils.parseApiDate(startDate);
      if (!start) {
        return res.status(400).json({
          success: false,
          error: 'Invalid start date format'
        });
      }
    } else {
      start = new Date();
    }
    start.setDate(1); // First day of month
    
    if (endDate) {
      end = DateUtils.parseApiDate(endDate);
      if (!end) {
        return res.status(400).json({
          success: false,
          error: 'Invalid end date format'
        });
      }
    } else {
      end = new Date(start);
    }
    end.setMonth(end.getMonth() + 2); // Default to 2 months from start
    end.setDate(0); // Last day of month
    
    // Find all confirmed bookings for this asset in the date range
    const bookings = await measureDb(() => Booking.find({
      asset: assetId,
      status: 'confirmed',
      $or: [
        // Bookings that start within the range
        { startDate: { $gte: start, $lte: end } },
        // Bookings that end within the range
        { endDate: { $gte: start, $lte: end } },
        // Bookings that span the entire range
        { startDate: { $lte: start }, endDate: { $gte: end } }
      ]
    }).select('startDate endDate user').lean());

    // Find special dates for this asset in the date range
    // Get both universal special dates and asset-specific ones
    const specialDates = await measureDb(() => SpecialDate.find({
      $and: [
        {
          $or: [
            { asset: null }, // Universal special dates
            { asset: assetId } // Asset-specific special dates
          ]
        }
      ]
    }).select('startDate endDate type repeatYearly').lean());
    
    // Prepare calendar data
    const calendar = {};
    const computeStartedAt = Date.now();
    
    // Generate dates in the range using consistent date handling
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = DateUtils.formatForApi(currentDate); // Use DateUtils for consistent formatting
      calendar[dateStr] = { available: true, bookings: [] };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Mark booked dates using consistent date handling
    bookings.forEach(booking => {
      const bookingStart = DateUtils.parseApiDate(booking.startDate);
      const bookingEnd = DateUtils.parseApiDate(booking.endDate);
      
      const current = new Date(bookingStart);
      while (current <= bookingEnd) {
        const dateStr = DateUtils.formatForApi(current);
        if (calendar[dateStr]) {
          calendar[dateStr].available = false;
          calendar[dateStr].bookings.push({
            bookingId: booking._id,
            userId: booking.user
          });
        }
        current.setDate(current.getDate() + 1);
      }
    });

    // FEAT-ADMIN-BLOCK-001: Mark blocked dates as unavailable
    const BlockedDate = require('../models/BlockedDate');
    const blockedDates = await measureDb(() => BlockedDate.find({
      asset: assetId,
      $or: [
        { startDate: { $gte: start, $lte: end } },
        { endDate: { $gte: start, $lte: end } },
        { startDate: { $lte: start }, endDate: { $gte: end } }
      ]
    }).select('startDate endDate blockType reason').lean());
    
    blockedDates.forEach(block => {
      const blockStart = DateUtils.parseApiDate(block.startDate);
      const blockEnd = DateUtils.parseApiDate(block.endDate);
      
      const current = new Date(blockStart);
      while (current <= blockEnd) {
        const dateStr = DateUtils.formatForApi(current);
        if (calendar[dateStr]) {
          calendar[dateStr].available = false;
          // Add block metadata for admin view (optional - can be used by admin UI)
          if (!calendar[dateStr].blocks) {
            calendar[dateStr].blocks = [];
          }
          calendar[dateStr].blocks.push({
            blockId: block._id,
            blockType: block.blockType,
            reason: block.reason
          });
        }
        current.setDate(current.getDate() + 1);
      }
    });

    // Prepare special dates arrays for frontend compatibility
    const specialDatesType1 = [];
    const specialDatesType2 = [];
    
    specialDates.forEach(specialDate => {
      const originalStart = new Date(specialDate.startDate);
      const originalEnd = new Date(specialDate.endDate);
      
      // If repeatYearly is true, generate dates for multiple years
      if (specialDate.repeatYearly) {
        // Generate dates for the current year and next few years
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        
        for (let year = startYear; year <= endYear + 1; year++) {
          const specialStart = new Date(originalStart);
          specialStart.setFullYear(year);
          
          const specialEnd = new Date(originalEnd);
          specialEnd.setFullYear(year);
          
          // Only process special dates that actually overlap with our query range
          if (specialStart <= end && specialEnd >= start) {
            // Find the overlap period between special date and query range
            const overlapStart = new Date(Math.max(specialStart.getTime(), start.getTime()));
            const overlapEnd = new Date(Math.min(specialEnd.getTime(), end.getTime()));
            
            // Generate dates only within the overlap period
            const current = new Date(overlapStart);
            while (current <= overlapEnd) {
              const dateStr = current.toISOString().split('T')[0];
              
              // Only include dates that are in our calendar (within query range)
              if (calendar[dateStr]) {
                if (specialDate.type === 'type1') {
                  specialDatesType1.push(dateStr);
                } else if (specialDate.type === 'type2') {
                  specialDatesType2.push(dateStr);
                }
              }
              
              current.setDate(current.getDate() + 1);
            }
          }
        }
      } else {
        // One-time special date
        const specialStart = new Date(specialDate.startDate);
        const specialEnd = new Date(specialDate.endDate);
        
        // Only process special dates that actually overlap with our query range
        if (specialStart <= end && specialEnd >= start) {
          // Find the overlap period between special date and query range
          const overlapStart = new Date(Math.max(specialStart.getTime(), start.getTime()));
          const overlapEnd = new Date(Math.min(specialEnd.getTime(), end.getTime()));
          
          // Generate dates only within the overlap period
          const current = new Date(overlapStart);
          while (current <= overlapEnd) {
            const dateStr = current.toISOString().split('T')[0];
            
            // Only include dates that are in our calendar (within query range)
            if (calendar[dateStr]) {
              if (specialDate.type === 'type1') {
                specialDatesType1.push(dateStr);
              } else if (specialDate.type === 'type2') {
                specialDatesType2.push(dateStr);
              }
            }
            
            current.setDate(current.getDate() + 1);
          }
        }
      }
    });
    req.perf?.add('compute', Date.now() - computeStartedAt);
    
    const responseComputeStartedAt = Date.now();
    const responsePayload = {
      success: true,
      data: {
        calendar,
        specialDates: {
          type1: specialDatesType1,
          type2: specialDatesType2
        }
      }
    };
    req.perf?.add('compute', Date.now() - responseComputeStartedAt);
    res.status(200).json(responsePayload);
  } catch (err) {
    console.error('Error in getAvailability:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get user's booking allocation and usage
// @route   GET /api/bookings/allocation/:userId/:assetId
// @access  Private
exports.getUserAllocation = async (req, res) => {
  try {
    const { userId, assetId } = req.params;
    const measureDb = async (operation) => {
      const startedAt = Date.now();
      const result = await operation();
      req.perf?.add('dbRead', Date.now() - startedAt);
      return result;
    };
    
    // Get user's ownership percentage
    const asset = await measureDb(() => Asset.findById(assetId).select('type owners').lean());
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    const userOwnership = asset.owners.find(owner => 
      owner.user.toString() === userId
    );
    
    if (!userOwnership) {
      return res.status(403).json({
        success: false,
        error: 'User does not own shares in this asset'
      });
    }
    
    const sharePercentage = userOwnership.sharePercentage;
    const allowedDaysPerYear = calculateAllowedDays(sharePercentage);
    const extraAllowedDays = calculateExtraAllowedDays(sharePercentage);
    const maxActiveBookings = calculateMaxActiveBookings(sharePercentage);
    const assetType = asset.type;
    const shortTermMaxDays = getShortTermThresholdDaysByAssetType(assetType);

    // Anniversary-based rolling allocation windows (current + next), anchored per user+asset.
    // Forward-only changes: pick the most recent anniversaryHistory entry effective on/ before "today".
    const now = new Date();
    const today = DateUtils.parseApiDate(DateUtils.normalize(now)); // date-only UTC midnight

    const history = Array.isArray(userOwnership.anniversaryHistory) ? userOwnership.anniversaryHistory : [];
    const effectiveEntry = history
      .filter((h) => h && h.effectiveFrom && h.anniversaryDate && new Date(h.effectiveFrom).getTime() <= today.getTime())
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];

    // Default anchor: ownership "since" date (existing field) if no configured anniversary history.
    const anchorDate = effectiveEntry?.anniversaryDate || userOwnership.since;
    const rolling = DateUtils.getRollingAnniversaryWindows(anchorDate, today);

    const currentWindow = {
      windowStart: rolling.currentWindow.start,
      windowEnd: rolling.currentWindow.end
    };
    const nextWindow = {
      windowStart: rolling.nextWindow.start,
      windowEnd: rolling.nextWindow.end
    };
    
    // Calculate special date allocations based on ownership
    // Each 1/8 share (12.5%) gives access to 1 special date of each type
    const eighthShares = Math.floor(sharePercentage / 12.5);
    const specialDateAllocation = {
      type1: {
        total: eighthShares,
        used: 0
      },
      type2: {
        total: eighthShares,
        used: 0
      }
    };

    const allocationBookingFields = [
      '_id',
      'startDate',
      'endDate',
      'status',
      'shortTermCancelled',
      'remainingPenaltyDays',
      'originalDays',
      'rebookedDays',
      'specialDateType',
      'isShortTerm',
      'isExtraDays',
      'extraDayCount',
      'cancelledAt',
      'reassignedTo',
      'reassignedAt'
    ].join(' ');

    const getPenaltyDays = (booking) => {
      if (!(booking.status === 'cancelled' && booking.shortTermCancelled)) {
        return 0;
      }
      if (typeof booking.remainingPenaltyDays === 'number') {
        return booking.remainingPenaltyDays;
      }
      const originalDays = booking.originalDays || calculateBookingDays(booking.startDate, booking.endDate);
      const rebookedDays = booking.rebookedDays || 0;
      return Math.max(0, originalDays - rebookedDays);
    };
    
    // Get bookings for current rolling window
    const currentYearBookings = await measureDb(() => Booking.find({
      user: userId,
      asset: assetId,
      $or: [
        { status: { $ne: 'cancelled' } },
        { status: 'cancelled', shortTermCancelled: true }
      ],
      startDate: { $gte: currentWindow.windowStart },
      // Rolling windows are treated as half-open: [start, end)
      endDate: { $lt: currentWindow.windowEnd }
    }).select(allocationBookingFields).lean());
    
    
    // Get bookings for next rolling window
    const nextYearBookings = await measureDb(() => Booking.find({
      user: userId,
      asset: assetId,
      $or: [
        { status: { $ne: 'cancelled' } },
        { status: 'cancelled', shortTermCancelled: true }
      ],
      startDate: { $gte: nextWindow.windowStart },
      endDate: { $lt: nextWindow.windowEnd }
    }).select(allocationBookingFields).lean());
    
    // Calculate special date usage for current year
    const calculateSpecialDateUsage = (bookings) => {
      const usage = { type1: 0, type2: 0 };
      
      bookings.forEach(booking => {
        // Only count active bookings (confirmed/pending) for special dates
        // Short-term cancelled bookings should NOT count toward special date allocation
        // because the special date slot should be available for others to book
        if (booking.status !== 'cancelled') {
          if (booking.specialDateType === 'type1') {
            usage.type1++;
          } else if (booking.specialDateType === 'type2') {
            usage.type2++;
          }
        }
      });
      
      return usage;
    };
    
    const currentYearSpecialDateUsage = calculateSpecialDateUsage(currentYearBookings);
    const nextYearSpecialDateUsage = calculateSpecialDateUsage(nextYearBookings);
    
    // Update special date allocation with maximum usage across years (not sum)
    // Special date limits are per year, so we show the maximum usage across all years
    specialDateAllocation.type1.used = Math.max(currentYearSpecialDateUsage.type1, nextYearSpecialDateUsage.type1);
    specialDateAllocation.type2.used = Math.max(currentYearSpecialDateUsage.type2, nextYearSpecialDateUsage.type2);
    
    // Get active bookings (including future years, excluding cancelled except short-term cancelled ones)
    const activeBookings = await measureDb(() => Booking.find({
      user: userId,
      asset: assetId,
      $or: [
        { status: { $ne: 'cancelled' } },
        { status: 'cancelled', shortTermCancelled: true } // Include short-term cancelled bookings that still count
      ],
      endDate: { $gte: now }
    }).sort({ startDate: 1 }).select(allocationBookingFields).lean());
    
    const allocationComputeStartedAt = Date.now();
    
    // Calculate days booked from standard allocation for current year
    const currentYearRegularDaysBooked = currentYearBookings
      .filter(booking => !booking.isExtraDays)
      .reduce((total, booking) => {
        // For short-term cancelled bookings, use remaining penalty days
        if (booking.status === 'cancelled' && booking.shortTermCancelled) {
          return total + getPenaltyDays(booking);
        }
        // For active bookings, use full booking days
        const days = calculateBookingDays(booking.startDate, booking.endDate);
        return total + days;
      }, 0);
    
    // Calculate days booked from standard allocation for next year
    const nextYearRegularDaysBooked = nextYearBookings
      .filter(booking => !booking.isExtraDays)
      .reduce((total, booking) => {
        // For short-term cancelled bookings, use remaining penalty days
        if (booking.status === 'cancelled' && booking.shortTermCancelled) {
          return total + getPenaltyDays(booking);
        }
        // For active bookings, use full booking days
        const days = calculateBookingDays(booking.startDate, booking.endDate);
        return total + days;
      }, 0);
    
    // Calculate extra days used for current year
    const currentYearExtraDaysUsed = currentYearBookings
      .filter(booking => booking.isExtraDays)
      .reduce((total, booking) => {
        if (typeof booking.extraDayCount === 'number' && booking.extraDayCount > 0) {
          return total + booking.extraDayCount;
        }
        // Backward-compat for legacy rows where extraDayCount may be missing.
        return total + calculateBookingDays(booking.startDate, booking.endDate);
      }, 0);
    
    // Calculate extra days used for next year
    const nextYearExtraDaysUsed = nextYearBookings
      .filter(booking => booking.isExtraDays)
      .reduce((total, booking) => {
        if (typeof booking.extraDayCount === 'number' && booking.extraDayCount > 0) {
          return total + booking.extraDayCount;
        }
        // Backward-compat for legacy rows where extraDayCount may be missing.
        return total + calculateBookingDays(booking.startDate, booking.endDate);
      }, 0);
    req.perf?.add('compute', Date.now() - allocationComputeStartedAt);
    
    // FEAT-ACTIVE-001: Universal active bookings counter (weighted, threshold-excluded)
    const activeBookingsUsed = await countUniversalActiveBookings(userId, assetId, {
      now,
      assetType,
      perf: req.perf
    });
    const activeBookingsRemaining = Math.max(0, maxActiveBookings - activeBookingsUsed);
    
    // Count active bookings per year (LEGACY - kept for backward compatibility)
    const currentYearActiveBookings = await countActiveBookings(userId, assetId, now.getFullYear(), {
      now,
      assetType,
      shortTermMaxDays,
      perf: req.perf
    });
    const nextYearActiveBookings = await countActiveBookings(userId, assetId, now.getFullYear() + 1, {
      now,
      assetType,
      shortTermMaxDays,
      perf: req.perf
    });
    
    // Get the count of short-term cancelled bookings that still count against allocation (per year)
    // Only count future bookings (endDate >= now) since past penalties are already accounted for
    const currentYearShortTermCancelled = currentYearBookings.filter(
      booking => booking.status === 'cancelled' && booking.shortTermCancelled && booking.endDate >= now
    ).length;
    
    const nextYearShortTermCancelled = nextYearBookings.filter(
      booking => booking.status === 'cancelled' && booking.shortTermCancelled && booking.endDate >= now
    ).length;
    
    const responseComputeStartedAt = Date.now();
    const responsePayload = {
      success: true,
      data: {
        sharePercentage,
        allowedDaysPerYear,
        extraAllowedDays,
        maxActiveBookings,
        maxStayLength: calculateMaxConsecutiveDays(sharePercentage),
        standardBookingLength: STANDARD_BOOKING_LENGTH,
        maxAdvanceBookingYears: MAX_ADVANCE_BOOKING_YEARS,
        
        // FEAT-ACTIVE-001: Universal active bookings counter (primary fields)
        activeBookingsUsed,
        activeBookingsRemaining,
        
        shortTermCancelledBookings: currentYearShortTermCancelled + nextYearShortTermCancelled,
        currentYearShortTermCancelled,
        nextYearShortTermCancelled,
        currentYearShortTermPenaltyDays: currentYearBookings
          .filter(b => b.status === 'cancelled' && b.shortTermCancelled && b.endDate >= now)
          .reduce((total, b) => total + getPenaltyDays(b), 0),
        nextYearShortTermPenaltyDays: nextYearBookings
          .filter(b => b.status === 'cancelled' && b.shortTermCancelled && b.endDate >= now)
          .reduce((total, b) => total + getPenaltyDays(b), 0),
        specialDates: specialDateAllocation,
        // Explicit window ranges (date-only) for UIs
        currentWindow: {
          start: DateUtils.formatForApi(currentWindow.windowStart),
          end: DateUtils.formatForApi(currentWindow.windowEnd)
        },
        nextWindow: {
          start: DateUtils.formatForApi(nextWindow.windowStart),
          end: DateUtils.formatForApi(nextWindow.windowEnd)
        },
        
        // Current window allocation (kept under currentYear for backwards compatibility)
        currentYear: {
          year: currentWindow.windowStart.getFullYear(),
          windowStart: DateUtils.formatForApi(currentWindow.windowStart),
          windowEnd: DateUtils.formatForApi(currentWindow.windowEnd),
          daysBooked: currentYearRegularDaysBooked,
          daysRemaining: allowedDaysPerYear - currentYearRegularDaysBooked,
          extraDaysUsed: currentYearExtraDaysUsed,
          extraDaysRemaining: extraAllowedDays - currentYearExtraDaysUsed,
          specialDateUsage: currentYearSpecialDateUsage,
          // FEAT-CANCEL-PENALTY-001: Only show future penalty bookings in UI
          // Past penalties are already accounted for in historical allocation windows
          penaltyDays: currentYearBookings
            .filter(b => b.status === 'cancelled' && b.shortTermCancelled && b.endDate >= now)
            .reduce((total, b) => total + getPenaltyDays(b), 0),
          penaltyBookings: currentYearBookings
            .filter(b => b.status === 'cancelled' && b.shortTermCancelled && b.endDate >= now)
            .map(b => ({
              id: b._id,
              startDate: b.startDate ? b.startDate.toISOString().split('T')[0] : null,
              endDate: b.endDate ? b.endDate.toISOString().split('T')[0] : null,
              originalDays: b.originalDays,
              rebookedDays: b.rebookedDays || 0,
              remainingPenaltyDays: getPenaltyDays(b),
              cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString().split('T')[0] : null,
              reassignedTo: b.reassignedTo || null,
              reassignedAt: b.reassignedAt ? b.reassignedAt.toISOString().split('T')[0] : null
            })),
          bookings: currentYearBookings.map(b => ({
            id: b._id,
            startDate: b.startDate ? b.startDate.toISOString().split('T')[0] : null,
            endDate: b.endDate ? b.endDate.toISOString().split('T')[0] : null,
            status: b.status,
            isShortTerm: b.isShortTerm,
            isExtraDays: b.isExtraDays,
            shortTermCancelled: b.shortTermCancelled,
            remainingPenaltyDays: getPenaltyDays(b),
            specialDateType: b.specialDateType,
            days: calculateBookingDays(b.startDate, b.endDate)
          }))
        },
        
        // Next window allocation (kept under nextYear for backwards compatibility)
        nextYear: {
          year: nextWindow.windowStart.getFullYear(),
          windowStart: DateUtils.formatForApi(nextWindow.windowStart),
          windowEnd: DateUtils.formatForApi(nextWindow.windowEnd),
          daysBooked: nextYearRegularDaysBooked,
          daysRemaining: allowedDaysPerYear - nextYearRegularDaysBooked,
          extraDaysUsed: nextYearExtraDaysUsed,
          extraDaysRemaining: extraAllowedDays - nextYearExtraDaysUsed,
          specialDateUsage: nextYearSpecialDateUsage,
          // FEAT-CANCEL-PENALTY-001: Only show future penalty bookings in UI
          // Past penalties are already accounted for in historical allocation windows
          penaltyDays: nextYearBookings
            .filter(b => b.status === 'cancelled' && b.shortTermCancelled && b.endDate >= now)
            .reduce((total, b) => total + getPenaltyDays(b), 0),
          penaltyBookings: nextYearBookings
            .filter(b => b.status === 'cancelled' && b.shortTermCancelled && b.endDate >= now)
            .map(b => ({
              id: b._id,
              startDate: b.startDate ? b.startDate.toISOString().split('T')[0] : null,
              endDate: b.endDate ? b.endDate.toISOString().split('T')[0] : null,
              originalDays: b.originalDays,
              rebookedDays: b.rebookedDays || 0,
              remainingPenaltyDays: getPenaltyDays(b),
              cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString().split('T')[0] : null,
              reassignedTo: b.reassignedTo || null,
              reassignedAt: b.reassignedAt ? b.reassignedAt.toISOString().split('T')[0] : null
            })),
          bookings: nextYearBookings.map(b => ({
            id: b._id,
            startDate: b.startDate ? b.startDate.toISOString().split('T')[0] : null,
            endDate: b.endDate ? b.endDate.toISOString().split('T')[0] : null,
            status: b.status,
            isShortTerm: b.isShortTerm,
            isExtraDays: b.isExtraDays,
            shortTermCancelled: b.shortTermCancelled,
            remainingPenaltyDays: getPenaltyDays(b),
            specialDateType: b.specialDateType,
            days: calculateBookingDays(b.startDate, b.endDate)
          }))
        },
        
        // Active bookings per year
        currentYearActiveBookings: currentYearActiveBookings,
        currentYearActiveBookingsRemaining: maxActiveBookings - currentYearActiveBookings,
        nextYearActiveBookings: nextYearActiveBookings,
        nextYearActiveBookingsRemaining: maxActiveBookings - nextYearActiveBookings,
        
        // Legacy fields for backward compatibility
        activeBookings: currentYearActiveBookings,
        activeBookingsRemaining: maxActiveBookings - currentYearActiveBookings,
        futureBookings: activeBookings
          .filter((b) => !isBookingInShortTermWindow(assetId, b.startDate, b.endDate, { now, shortTermMaxDays }))
          .map((b) => ({
            id: b._id,
            startDate: b.startDate ? b.startDate.toISOString().split('T')[0] : null,
            endDate: b.endDate ? b.endDate.toISOString().split('T')[0] : null,
            status: b.status,
            isShortTerm: b.isShortTerm,
            isExtraDays: b.isExtraDays,
            shortTermCancelled: b.shortTermCancelled,
            remainingPenaltyDays: getPenaltyDays(b),
            days: calculateBookingDays(b.startDate, b.endDate)
          })),
        
        // Legacy fields for backward compatibility
        daysBooked: currentYearRegularDaysBooked,
        daysRemaining: allowedDaysPerYear - currentYearRegularDaysBooked,
        extraDaysUsed: currentYearExtraDaysUsed,
        extraDaysRemaining: extraAllowedDays - currentYearExtraDaysUsed,
        currentBookings: currentYearBookings.map(b => ({
          id: b._id,
          startDate: b.startDate ? b.startDate.toISOString().split('T')[0] : null,
          endDate: b.endDate ? b.endDate.toISOString().split('T')[0] : null,
          status: b.status,
          isShortTerm: b.isShortTerm,
          isExtraDays: b.isExtraDays,
          shortTermCancelled: b.shortTermCancelled,
          remainingPenaltyDays: getPenaltyDays(b),
          days: calculateBookingDays(b.startDate, b.endDate)
        })),
        allocationWindow: {
          start: DateUtils.formatForApi(currentWindow.windowStart),
          end: DateUtils.formatForApi(currentWindow.windowEnd)
        }
      }
    };
    req.perf?.add('compute', Date.now() - responseComputeStartedAt);
    res.status(200).json(responsePayload);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get special dates for an asset
// @route   GET /api/bookings/special-dates/:assetId
// @access  Private
exports.getSpecialDates = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { year } = req.query;
    
    // Default to current year if not specified
    const queryYear = year ? parseInt(year) : new Date().getFullYear();
    
    const specialDates = await SpecialDate.find({
      asset: assetId,
      year: queryYear
    });
    
    res.status(200).json({
      success: true,
      count: specialDates.length,
      data: specialDates
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get all special dates (both universal and asset-specific)
// @route   GET /api/bookings/special-dates/all
// @access  Private (Admin only)
exports.getAllSpecialDates = async (req, res) => {
  try {
    const specialDates = await SpecialDate.find({})
      .populate('asset', 'name type')
      .sort({ startDate: 1 });
    
    res.status(200).json({
      success: true,
      count: specialDates.length,
      data: specialDates
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create special dates
// @route   POST /api/bookings/special-dates
// @access  Private (Admin only)
exports.createSpecialDates = async (req, res) => {
  try {
    const { assetId, dates, type, name, startDate, endDate, repeatYearly } = req.body;
    
    // Handle both single special date and array of dates
    let datesToProcess;
    if (dates && Array.isArray(dates)) {
      datesToProcess = dates;
    } else if (type && name && startDate && endDate) {
      // Single special date creation
      datesToProcess = [{ type, name, startDate, endDate, repeatYearly: repeatYearly || false }];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either an array of special dates or individual special date fields'
      });
    }
    
    if (datesToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one special date'
      });
    }
    
    // Validate dates
    for (const date of datesToProcess) {
      if (!date.type || !['type1', 'type2'].includes(date.type)) {
        return res.status(400).json({
          success: false,
          error: 'Special date type must be "type1" or "type2"'
        });
      }
      
      if (!date.startDate || !date.endDate) {
        return res.status(400).json({
          success: false,
          error: 'Each special date must include startDate and endDate'
        });
      }
      
      // Validate that end date is on or after start date
      const start = new Date(date.startDate + 'T00:00:00');
      const end = new Date(date.endDate + 'T00:00:00');
      if (end < start) {
        return res.status(400).json({
          success: false,
          error: 'End date must be on or after start date'
        });
      }
      
      // Ensure dates are not overlapping within the same type (universal or per asset)
      const query = {
        type: date.type
      };
      if (assetId) {
        query.asset = assetId;
      } else {
        query.asset = null;
      }
      const existingDates = await SpecialDate.find(query);
      
      const newStartDate = new Date(date.startDate);
      const newEndDate = new Date(date.endDate);
      
      for (const existing of existingDates) {
        const existingStartDate = new Date(existing.startDate);
        const existingEndDate = new Date(existing.endDate);
        
        if (newStartDate <= existingEndDate && newEndDate >= existingStartDate) {
          return res.status(400).json({
            success: false,
            error: `Special date overlaps with existing ${date.type} special date`
          });
        }
      }
    }
    
    // Create special dates (assetId optional; null means universal)
    const specialDates = await SpecialDate.insertMany(
      datesToProcess.map(date => ({
        asset: assetId || null,
        type: date.type,
        startDate: date.startDate,
        endDate: date.endDate,
        repeatYearly: date.repeatYearly || false,
        name: date.name || `${date.type.toUpperCase()} Special Date`
      }))
    );
    
    res.status(201).json({
      success: true,
      count: specialDates.length,
      data: specialDates
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      res.status(500).json({
        success: false,
        error: err.message || 'Server Error'
      });
    }
  }
};

// @desc    Delete special date
// @route   DELETE /api/bookings/special-dates/:id
// @access  Private (Admin only)
exports.deleteSpecialDate = async (req, res) => {
  try {
    const specialDate = await SpecialDate.findById(req.params.id);
    
    if (!specialDate) {
      return res.status(404).json({
        success: false,
        error: 'Special date not found'
      });
    }
    
    await specialDate.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Reassign cancelled short-term booking when dates are rebooked
// @access  Private (Internal function used by createBooking)
// FEAT-CANCEL-PENALTY-001: Partial refund mechanism
// When ANY user (including the original booker) creates a booking, this function checks for 
// cancelled short-term bookings on the SAME asset that overlap with the new booking dates.
// For each overlap found, it immediately refunds the overlapping days to the original booker.
// This applies to:
// - Same user rebooking their own cancelled dates (gets their penalty days back)
// - Different user booking cancelled dates (original user gets refund)
// Multiple partial overlaps are cumulative (e.g., User A books 3 days, User B books 4 days = 7 days refunded).
// When 100% of days are refunded, the booking is marked as fully reassigned (shortTermCancelled = false).
const reassignCancelledShortTermBooking = async (userId, assetId, startDate, endDate) => {
  // Find cancelled short-term bookings that overlap with these dates
  // This includes SAME user rebooking their own cancelled dates
  const bookingStart = new Date(startDate);
  const bookingEnd = new Date(endDate);
  
  const cancelledShortTermBookings = await Booking.find({
    asset: assetId,  // Same asset (bookings on different assets don't trigger refund)
    // No user filter - includes ALL users (same user rebooking their own cancelled dates,
    // or different users booking dates cancelled by others)
    status: 'cancelled',
    shortTermCancelled: true,  // Has penalty days remaining
    $or: [
      // New booking starts during a cancelled booking
      { startDate: { $lte: bookingStart }, endDate: { $gte: bookingStart } },
      // New booking ends during a cancelled booking
      { startDate: { $lte: bookingEnd }, endDate: { $gte: bookingEnd } },
      // New booking completely contains a cancelled booking
      { startDate: { $gte: bookingStart }, endDate: { $lte: bookingEnd } }
    ]
  });
  
  let totalRebookedDays = 0;
  
  // Process each cancelled booking to calculate partial overlaps
  for (const cancelledBooking of cancelledShortTermBookings) {
    const cancelledStart = new Date(cancelledBooking.startDate);
    const cancelledEnd = new Date(cancelledBooking.endDate);
    
    // Calculate the exact overlap between the new booking and the cancelled booking
    // Uses Math.max for start (later of the two) and Math.min for end (earlier of the two)
    const overlapStart = new Date(Math.max(bookingStart.getTime(), cancelledStart.getTime()));
    const overlapEnd = new Date(Math.min(bookingEnd.getTime(), cancelledEnd.getTime()));
    
    // Calculate overlapping days using inclusive-inclusive semantics (+1 for end date)
    const overlappingDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
    
    if (overlappingDays > 0) {
      // Update the cancelled booking with partial rebooking information
      // CUMULATIVE: Add to existing rebookedDays (supports multiple partial refunds)
      const newRebookedDays = (cancelledBooking.rebookedDays || 0) + overlappingDays;
      const newRemainingPenaltyDays = cancelledBooking.originalDays - newRebookedDays;
      
      cancelledBooking.rebookedDays = newRebookedDays;
      cancelledBooking.remainingPenaltyDays = newRemainingPenaltyDays;
      
      // If all days have been rebooked (100% coverage), mark as fully reassigned
      if (newRemainingPenaltyDays <= 0) {
        cancelledBooking.shortTermCancelled = false;  // No longer has penalty
        cancelledBooking.reassignedTo = userId;  // Audit trail: who provided the final coverage
        cancelledBooking.reassignedAt = new Date();  // Audit trail: when full coverage was achieved
      }
      
      await cancelledBooking.save();
      totalRebookedDays += overlappingDays;
    }
  }
  
  return totalRebookedDays;
};

// @desc    Process payment for extra days
// @route   POST /api/bookings/payment/:id
// @access  Private
exports.processExtraDaysPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentDetails } = req.body;
    
    // Find the booking
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Check if booking belongs to the requesting user
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to process payment for this booking'
      });
    }
    
    // Check if booking has extra days that need payment
    if (!booking.isExtraDays || booking.extraDayCount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'This booking does not have any extra days requiring payment'
      });
    }
    
    // Check if payment has already been processed
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Payment has already been processed for this booking'
      });
    }
    
    // Calculate payment amount
    const paymentAmount = booking.extraDayCount * EXTRA_DAY_COST;
    
    // In a real application, you would process the payment here
    // This is a simplified version just for demonstration
    
    // Update booking with payment information
    booking.paymentStatus = 'paid';
    booking.paymentMethod = paymentMethod;
    booking.paymentAmount = paymentAmount;
    booking.paymentDate = new Date();
    booking.paymentDetails = paymentDetails;
    
    await booking.save();
    
    res.status(200).json({
      success: true,
      data: {
        booking: formatBookingForResponse(booking),
        payment: {
          amount: paymentAmount,
          status: 'paid',
          date: DateUtils.formatForApi(booking.paymentDate)
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};

// @desc    Get bookings for a specific asset
// @route   GET /api/bookings/asset/:assetId
// @access  Private
exports.getAssetBookings = async (req, res) => {
  try {
    const assetId = req.params.assetId;
    
    // Validate asset ID format
    if (!assetId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset ID format'
      });
    }
    
    // Check if asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    // Get all bookings for this asset
    const bookings = await Booking.find({ asset: assetId })
      .populate('user', 'name lastName email')
      .populate('asset', 'name location locationAddress propertyManager type description capacity amenities photos')
      .sort({ startDate: 1 }); // Sort by start date ascending
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings.map(formatBookingForResponse)
    });
  } catch (err) {
    console.error('Error fetching asset bookings:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// ============================================================================
// BLOCKED DATES ENDPOINTS (FEAT-ADMIN-BLOCK-001)
// ============================================================================

// @desc    Get blocked dates for an asset
// @route   GET /api/bookings/blocked-dates/:assetId
// @access  Private (Admin only)
exports.getBlockedDates = async (req, res) => {
  try {
    const { assetId } = req.params;
    
    // Validate asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    const BlockedDate = require('../models/BlockedDate');
    const blockedDates = await BlockedDate.find({ asset: assetId })
      .populate('createdByAdminId', 'name lastName email')
      .sort({ startDate: 1 });
    
    res.status(200).json({
      success: true,
      count: blockedDates.length,
      data: blockedDates.map(block => ({
        ...block.toObject(),
        startDate: DateUtils.formatForApi(block.startDate),
        endDate: DateUtils.formatForApi(block.endDate),
        createdAt: DateUtils.formatForApi(block.createdAt),
        updatedAt: DateUtils.formatForApi(block.updatedAt)
      }))
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};

// @desc    Create blocked date range
// @route   POST /api/bookings/blocked-dates
// @access  Private (Admin only)
exports.createBlockedDate = async (req, res) => {
  try {
    const { assetId, startDate: startDateStr, endDate: endDateStr, blockType, reason, force } = req.body;
    const adminId = req.user.id;
    
    // Validate required fields
    if (!assetId || !startDateStr || !endDateStr) {
      return res.status(400).json({
        success: false,
        error: 'Asset ID, start date, and end date are required'
      });
    }
    
    // Parse dates
    const startDate = DateUtils.parseApiDate(startDateStr);
    const endDate = DateUtils.parseApiDate(endDateStr);
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }
    
    // Check if asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    // Check for overlapping confirmed bookings
    const overlappingBookings = await Booking.find({
      asset: assetId,
      status: 'confirmed',
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    }).populate('user', 'name lastName email');
    
    // If there are overlaps and force is not true, return 409 with details
    if (overlappingBookings.length > 0 && !force) {
      return res.status(409).json({
        success: false,
        error: 'This date range overlaps with existing bookings',
        requiresConfirmation: true,
        overlappingBookings: overlappingBookings.map(booking => ({
          id: booking._id,
          startDate: DateUtils.formatForApi(booking.startDate),
          endDate: DateUtils.formatForApi(booking.endDate),
          user: booking.user ? {
            name: booking.user.name,
            lastName: booking.user.lastName,
            email: booking.user.email
          } : null
        }))
      });
    }
    
    // Create the blocked date
    const BlockedDate = require('../models/BlockedDate');
    const blockedDate = await BlockedDate.create({
      asset: assetId,
      startDate,
      endDate,
      blockType: blockType || 'other',
      reason: reason || '',
      createdByAdminId: adminId,
      createdWithForce: !!force && overlappingBookings.length > 0,
      overlapNote: force && overlappingBookings.length > 0 
        ? `Created despite ${overlappingBookings.length} overlapping booking(s)` 
        : ''
    });
    
    res.status(201).json({
      success: true,
      data: {
        ...blockedDate.toObject(),
        startDate: DateUtils.formatForApi(blockedDate.startDate),
        endDate: DateUtils.formatForApi(blockedDate.endDate),
        createdAt: DateUtils.formatForApi(blockedDate.createdAt),
        updatedAt: DateUtils.formatForApi(blockedDate.updatedAt)
      },
      message: force && overlappingBookings.length > 0
        ? `Block created with ${overlappingBookings.length} overlapping booking(s)`
        : 'Block created successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};

// @desc    Delete blocked date
// @route   DELETE /api/bookings/blocked-dates/:id
// @access  Private (Admin only)
exports.deleteBlockedDate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const BlockedDate = require('../models/BlockedDate');
    const blockedDate = await BlockedDate.findById(id);
    
    if (!blockedDate) {
      return res.status(404).json({
        success: false,
        error: 'Blocked date not found'
      });
    }
    
    await BlockedDate.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Blocked date removed successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
}; 
