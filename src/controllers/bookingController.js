const Booking = require('../models/Booking');
const User = require('../models/User');
const Asset = require('../models/Asset');
const SpecialDate = require('../models/SpecialDate');

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

// Helper function to calculate booking duration including both start and end dates
const calculateBookingDays = (startDate, endDate) => {
  // Add 1 to include both start and end dates
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
};

// Helper function to check booking time frame constraints
const validateBookingTimeframe = async (startDate, endDate, assetId, sharePercentage) => {
  const now = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(now.getFullYear() + MAX_ADVANCE_BOOKING_YEARS);
  
  const bookingStartDate = new Date(startDate);
  const bookingEndDate = new Date(endDate);
  
  // Cannot book in the past
  if (bookingStartDate < now) {
    return {
      isValid: false,
      error: 'Cannot book dates in the past'
    };
  }
  
  // No minimum advance days (real-time booking allowed)
  const daysInAdvance = Math.ceil((bookingStartDate - now) / (1000 * 60 * 60 * 24));
  
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
  if (bookingDays < minStay) {
    return {
      isValid: false,
      error: `Minimum stay for ${asset.type} is ${minStay} day${minStay > 1 ? 's' : ''}`
    };
  }
  
  return { isValid: true };
};

// Helper function to count active bookings for a user on an asset
const countActiveBookings = async (userId, assetId) => {
  const now = new Date();
  
  const bookings = await Booking.find({
    user: userId,
    asset: assetId,
    status: { $ne: 'cancelled' },
    endDate: { $gte: now }
  });
  
  return bookings.length;
};

// Helper function to calculate minimum gap between bookings
const calculateBookingGap = async (userId, assetId, newStartDate, newEndDate) => {
  const now = new Date();
  
  // Find the most recent completed booking
  const lastBooking = await Booking.findOne({
    user: userId,
    asset: assetId,
    status: { $ne: 'cancelled' },
    endDate: { $lt: now }
  }).sort({ endDate: -1 });
  
  // Find the next upcoming booking after the proposed new booking
  const nextBooking = await Booking.findOne({
    user: userId,
    asset: assetId,
    status: { $ne: 'cancelled' },
    startDate: { $gt: new Date(newEndDate) }
  }).sort({ startDate: 1 });
  
  const newBookingDuration = calculateBookingDays(new Date(newStartDate), new Date(newEndDate));
  
  let minGapResult = {
    hasMinGapConstraint: false,
    minimumGap: 0,
    daysBetweenBookings: 0,
    lastBookingEndDate: null
  };
  
  // Calculate minimum gap based on previous booking (exclusive in-between days)
  if (lastBooking) {
    const lastStayDuration = calculateBookingDays(lastBooking.startDate, lastBooking.endDate);
    
    const startMidnight = new Date(newStartDate);
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
  
  return { minGapResult };
};

// Helper function to check if booking is short-term
const isShortTermBooking = async (assetId, startDate) => {
  const now = new Date();
  const bookingStart = new Date(startDate);
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

// Compute current allocation window based on ownership anniversary
const computeAllocationWindow = (ownershipSinceDate) => {
  const now = new Date();
  const since = new Date(ownershipSinceDate);
  const anniversaryThisYear = new Date(now.getFullYear(), since.getMonth(), since.getDate());
  let windowStart = anniversaryThisYear;
  if (now < anniversaryThisYear) {
    windowStart = new Date(now.getFullYear() - 1, since.getMonth(), since.getDate());
  }
  const windowEnd = new Date(windowStart);
  windowEnd.setFullYear(windowEnd.getFullYear() + 1);
  windowEnd.setDate(windowEnd.getDate() - 1);
  return { windowStart, windowEnd };
};

// Check for special date overlap types in a period
const getOverlappingSpecialDateTypes = async (startDate, endDate) => {
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();
  const years = startYear === endYear ? [startYear] : [startYear, endYear];
  const specialDates = await SpecialDate.find({ asset: null, year: { $in: years } });
  const bookingStart = new Date(startDate);
  const bookingEnd = new Date(endDate);
  const types = new Set();
  specialDates.forEach(sd => {
    const s = new Date(sd.startDate);
    const e = new Date(sd.endDate);
    if (bookingStart <= e && bookingEnd >= s) {
      types.add(sd.type);
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
  if (new Date(startDate) <= sixtyDaysFromNow) {
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
      query.$or = [
        // Bookings that start within the range
        { 
          startDate: { 
            $gte: new Date(req.query.startDate), 
            $lte: new Date(req.query.endDate) 
          } 
        },
        // Bookings that end within the range
        { 
          endDate: { 
            $gte: new Date(req.query.startDate), 
            $lte: new Date(req.query.endDate) 
          } 
        },
        // Bookings that span the entire range
        {
          startDate: { $lte: new Date(req.query.startDate) },
          endDate: { $gte: new Date(req.query.endDate) }
        }
      ];
    }
    
    const bookings = await Booking.find(query)
      .populate('user', 'name lastName email')
      .populate('asset', 'name location type description capacity amenities');
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
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
      .populate('asset', 'name location type description capacity amenities');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
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
    // Get user ID from the authenticated user or admin override
    const userId = req.body.userId && req.user.role === 'admin' ? req.body.userId : req.user.id;
    const { assetId, startDate: startDateStr, endDate: endDateStr, notes, useExtraDays } = req.body;
    
    // Convert date strings to Date objects
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
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
    
    // Validate booking timeframe
    const timeframeValidation = await validateBookingTimeframe(startDate, endDate, assetId, sharePercentage);
    if (!timeframeValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: timeframeValidation.error
      });
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
      if (gapValidation.minGapResult.hasMinGapConstraint && gapValidation.minGapResult.daysBetweenBookings < gapValidation.minGapResult.minimumGap) {
        return res.status(400).json({
          success: false,
          error: `You must wait at least ${gapValidation.minGapResult.minimumGap} days between bookings (based on your last stay duration). Your next available booking date is ${new Date(gapValidation.minGapResult.lastBookingEndDate.getTime() + gapValidation.minGapResult.minimumGap * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}.`
        });
      }

      // Enforce special date cap: when booking > 60 days in advance, allow only one active Type1 and one active Type2 across all assets
      const overlappingTypes = await getOverlappingSpecialDateTypes(startDate, endDate);
      if (overlappingTypes.length > 0) {
        const now = new Date();
        const sixtyDaysFromNow = new Date(now.getTime() + SHORT_TERM_MAX_DAYS * 24 * 60 * 60 * 1000);
        // Only enforce if the new booking starts beyond 60 days
        if (startDate > sixtyDaysFromNow) {
          const existingFutureBookings = await Booking.find({
            user: userId,
            status: { $ne: 'cancelled' },
            startDate: { $gt: now }
          });
          // Count user's existing future special-date bookings beyond 60 days
          const counts = { type1: 0, type2: 0 };
          for (const b of existingFutureBookings) {
            if (b.startDate <= sixtyDaysFromNow) continue; // restriction lifts within 60 days
            const types = await getOverlappingSpecialDateTypes(b.startDate, b.endDate);
            const uniqueTypes = new Set(types);
            if (uniqueTypes.has('type1')) counts.type1 += 1;
            if (uniqueTypes.has('type2')) counts.type2 += 1;
          }
          if (overlappingTypes.includes('type1') && counts.type1 >= 1) {
            return res.status(400).json({ success: false, error: 'You already have an active Type 1 special date booking more than 60 days away. You may book another Type 1 once you are within 60 days of your existing special date.' });
          }
          if (overlappingTypes.includes('type2') && counts.type2 >= 1) {
            return res.status(400).json({ success: false, error: 'You already have an active Type 2 special date booking more than 60 days away. You may book another Type 2 once you are within 60 days of your existing special date.' });
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
    
    // For very short-term bookings (less than 7 days notice), always allow using extra days
    let isExtraDays = false;
    let extraDayCount = 0;
    let extraDayCost = 0;
    
    if (isVeryShortTerm) {
      // Calculate extra allowed days
      const extraAllowedDays = calculateExtraAllowedDays(sharePercentage);
      
      // Calculate extra days used so far
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(`${currentYear}-01-01`);
      const yearEnd = new Date(`${currentYear}-12-31`);
      
      const extraDaysBookings = await Booking.find({
        user: userId,
        asset: assetId,
        isExtraDays: true,
        startDate: { $gte: yearStart },
        endDate: { $lte: yearEnd }
      });
      
      const extraDaysUsed = extraDaysBookings.reduce((total, booking) => {
        return total + (booking.extraDayCount || 0);
      }, 0);
      
      // Check if user has enough extra days available
      if (extraDaysUsed + bookingDays > extraAllowedDays) {
        return res.status(400).json({
          success: false,
          error: `This very short-term booking would exceed your extra days allocation. You have used ${extraDaysUsed} of your ${extraAllowedDays} extra days for the year.`,
          extraDaysNeeded: bookingDays,
          extraDaysAvailable: extraAllowedDays - extraDaysUsed,
          costEstimate: bookingDays * EXTRA_DAY_COST
        });
      }
      
      // Set extra days for very short-term bookings
      isExtraDays = true;
      extraDayCount = bookingDays;
      extraDayCost = bookingDays * EXTRA_DAY_COST;
    }
    
    // Only check booking limits if not a short-term booking
    if (!isShortTerm) {
      // Count user's current active bookings for this asset
      const currentActiveBookings = await countActiveBookings(userId, assetId);
      
      // Check if user has reached their maximum number of active bookings
      if (currentActiveBookings >= maxActiveBookings) {
        return res.status(400).json({
          success: false,
          error: `You already have ${currentActiveBookings} active bookings. Maximum allowed for your share (${sharePercentage}%) is ${maxActiveBookings}.`
        });
      }
      
      // Check how many "booking slots" this reservation will use
      // If booking exceeds STANDARD_BOOKING_LENGTH, it counts as multiple bookings
      const bookingSlotsRequired = Math.ceil(bookingDays / STANDARD_BOOKING_LENGTH);
      
      // Check if this would exceed the maximum allowed bookings
      if (currentActiveBookings + bookingSlotsRequired > maxActiveBookings) {
        return res.status(400).json({
          success: false,
          error: `This booking would require ${bookingSlotsRequired} booking slots. You have ${currentActiveBookings} active bookings and maximum allowed is ${maxActiveBookings}.`
        });
      }
      
      // Check user's existing bookings within allocation window based on ownership anniversary
      const { windowStart, windowEnd } = computeAllocationWindow(userOwnership.since || new Date());
      const existingBookings = await Booking.find({
        user: userId,
        asset: assetId,
        $or: [
          { status: { $ne: 'cancelled' } },
          { status: 'cancelled', shortTermCancelled: true }
        ],
        startDate: { $gte: windowStart },
        endDate: { $lte: windowEnd }
      });
      
      // Calculate days already booked in allocation window
      const daysBooked = existingBookings.reduce((total, b) => {
        const days = calculateBookingDays(b.startDate, b.endDate);
        return total + days;
      }, 0);
      
      // Compute number of days of this booking that fall within the allocation window
      let daysInAllocationWindow = 0;
      const overlapStart = new Date(Math.max(windowStart.getTime(), startDate.getTime()));
      const overlapEnd = new Date(Math.min(windowEnd.getTime(), endDate.getTime()));
      if (overlapEnd >= overlapStart) {
        daysInAllocationWindow = calculateBookingDays(overlapStart, overlapEnd);
      }
      
      // Calculate standard and extra day allocation
      const extraAllowedDays = calculateExtraAllowedDays(sharePercentage);
      
      // Calculate used extra days
      const extraDaysUsed = existingBookings
        .filter(booking => booking.isExtraDays)
        .reduce((total, booking) => {
          const days = calculateBookingDays(booking.startDate, booking.endDate);
          return total + days;
        }, 0);
      
      // Check if the new booking would exceed the user's standard allocation
      if (daysBooked + daysInAllocationWindow > allowedDaysPerYear) {
        // If exceeding standard allocation, check if user wants to use extra days
        if (useExtraDays) {
          // Calculate how many extra days would be needed
          const standardDaysRemaining = Math.max(0, allowedDaysPerYear - daysBooked);
          const extraDaysNeeded = daysInAllocationWindow - standardDaysRemaining;
          
          // Check if user has enough extra days available
          if (extraDaysUsed + extraDaysNeeded > extraAllowedDays) {
            return res.status(400).json({
              success: false,
              error: `This booking would exceed your extra days allocation. You have used ${extraDaysUsed} of your ${extraAllowedDays} extra days for the year.`,
              extraDaysNeeded,
              extraDaysAvailable: extraAllowedDays - extraDaysUsed,
              costEstimate: extraDaysNeeded * EXTRA_DAY_COST
            });
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
              extraDayCost
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
                extraDayCost: segmentExtraCost
              });
              
              // Update remaining extra days
              remainingExtraDays -= segmentExtraDays;
              
              // Move to next period
              currentStart.setDate(currentStart.getDate() + STANDARD_BOOKING_LENGTH);
            }
          }
          
          // Create all the bookings
          const createdBookings = await Booking.insertMany(bookingsToCreate);
          
          // Include extra day information in response
          return res.status(201).json({
            success: true,
            data: {
              bookings: createdBookings,
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
          // User does not want to use extra days
          return res.status(400).json({
            success: false,
            error: `Booking exceeds your allocation. You have used ${daysBooked} days of your ${allowedDaysPerYear} day allocation in the current anniversary window.`,
            canUseExtraDays: true,
            extraDaysAvailable: extraAllowedDays - extraDaysUsed,
            standardDaysRemaining: allowedDaysPerYear - daysBooked,
            extraDaysNeeded: Math.max(0, daysInAllocationWindow - (allowedDaysPerYear - daysBooked)),
            costEstimate: Math.max(0, daysInAllocationWindow - (allowedDaysPerYear - daysBooked)) * EXTRA_DAY_COST
          });
        }
      }
      
      // Check if booking overlaps with special dates and if user has exceeded their special date allocations
      // Only check if not a short-term booking
      const specialDateCheck = await checkSpecialDateBookings(userId, assetId, startDate, endDate, sharePercentage);
      if (!specialDateCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: specialDateCheck.error
        });
      }
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
    const specialDates = await SpecialDate.find({ asset: null, year: { $in: years } });
    
    specialDates.forEach(specialDate => {
      const specialStart = new Date(specialDate.startDate);
      const specialEnd = new Date(specialDate.endDate);
      
      // Check for overlap
      if (startDate <= specialEnd && endDate >= specialStart) {
        specialDateType = specialDate.type;
        bookingYear = specialDate.year;
      }
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
        extraDayCost
      });
    } else {
      // Split into multiple bookings of STANDARD_BOOKING_LENGTH days
      let currentStart = new Date(startDate);
      
      while (currentStart < endDate) {
        let currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + STANDARD_BOOKING_LENGTH - 1);
        
        // Ensure we don't exceed the original end date
        if (currentEnd > endDate) {
          currentEnd = new Date(endDate);
        }
        
        // Check if this segment overlaps with special dates
        let segmentSpecialDateType = specialDateType;
        let segmentYear = currentStart.getFullYear();
        
        // Re-check special dates for each segment
        specialDates.forEach(specialDate => {
          const specialStart = new Date(specialDate.startDate);
          const specialEnd = new Date(specialDate.endDate);
          
          // Check for overlap with this segment
          if (currentStart <= specialEnd && currentEnd >= specialStart) {
            segmentSpecialDateType = specialDate.type;
            segmentYear = specialDate.year;
          }
        });
        
        // Calculate days in this segment
        const segmentDays = calculateBookingDays(currentStart, currentEnd);
        
        // For very short-term bookings, all segments use extra days
        let segmentIsExtraDays = isExtraDays;
        let segmentExtraDayCount = isVeryShortTerm ? segmentDays : 0;
        let segmentExtraDayCost = isVeryShortTerm ? segmentDays * EXTRA_DAY_COST : 0;
        
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
          extraDayCost: segmentExtraDayCost
        });
        
        // Move to next period
        currentStart.setDate(currentStart.getDate() + STANDARD_BOOKING_LENGTH);
      }
    }
    
    // Create all the bookings
    const createdBookings = await Booking.insertMany(bookingsToCreate);
    
    res.status(201).json({
      success: true,
      data: {
        bookings: createdBookings,
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
      const startDate = req.body.startDate ? new Date(req.body.startDate) : booking.startDate;
      const endDate = req.body.endDate ? new Date(req.body.endDate) : booking.endDate;
      
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

        // Allowed and window by anniversary
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
        const { windowStart, windowEnd } = computeAllocationWindow(userOwnership.since || new Date());

        // Existing bookings in window excluding this one
        const existingBookings = await Booking.find({
          user: booking.user,
          asset: booking.asset,
          status: { $ne: 'cancelled' },
          startDate: { $gte: windowStart },
          endDate: { $lte: windowEnd },
          _id: { $ne: booking._id }
        });
        const daysBooked = existingBookings.reduce((total, b) => total + calculateBookingDays(b.startDate, b.endDate), 0);

        // Compute overlap deltas within window for old vs new booking
        const overlap = (s, e) => {
          const os = new Date(Math.max(windowStart.getTime(), s.getTime()));
          const oe = new Date(Math.min(windowEnd.getTime(), e.getTime()));
          if (oe < os) return 0;
          return calculateBookingDays(os, oe);
        };
        const oldOverlap = overlap(booking.startDate, booking.endDate);
        const newOverlap = overlap(startDate, endDate);
        const additionalOverlap = Math.max(0, newOverlap - oldOverlap);

        if (daysBooked + additionalOverlap > allowedDaysPerYear) {
          return res.status(400).json({
            success: false,
            error: `Booking update exceeds your annual allocation. You have used ${daysBooked} days of your ${allowedDaysPerYear} day allocation in the current anniversary window.`
          });
        }
      }
    }
    
    // Update the booking
    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: booking
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
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // If it's a short-term booking, mark it as cancelled but keep counting against allocation
    // unless another owner books it
    if (booking.isShortTerm) {
      // Mark the booking as cancelled
      booking.status = 'cancelled';
      
      // Add a flag to indicate this is a short-term cancellation that still counts against allocation
      booking.shortTermCancelled = true;
      
      // Set cancellation date
      booking.cancelledAt = new Date();
      
      await booking.save();
      
      // Optional: Notify other owners that these dates are available for short-term booking
      
      return res.status(200).json({
        success: true,
        message: 'Short-term booking cancelled. Note that this will still count against your allocation unless another owner books these dates.',
        data: booking
      });
    } else {
      // For long-term bookings, just mark as cancelled and don't count against allocation
      booking.status = 'cancelled';
      booking.cancelledAt = new Date();
      await booking.save();
      
      return res.status(200).json({
        success: true,
        message: 'Booking cancelled successfully.',
        data: booking
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
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
    
    // Default to current month if dates not provided
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(1); // First day of month
    
    const end = endDate ? new Date(endDate) : new Date(start);
    end.setMonth(end.getMonth() + 2); // Default to 2 months from start
    end.setDate(0); // Last day of month
    
    // Find all confirmed bookings for this asset in the date range
    const bookings = await Booking.find({
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
    }).select('startDate endDate user');

    // Find special dates for this asset in the date range
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const years = startYear === endYear ? [startYear] : [startYear, endYear];
    
    // Get universal special dates (not asset-specific)
    const specialDates = await SpecialDate.find({
      year: { $in: years },
      asset: null,  // Universal special dates
      $or: [
        // Special dates that start within the range
        { startDate: { $gte: start, $lte: end } },
        // Special dates that end within the range
        { endDate: { $gte: start, $lte: end } },
        // Special dates that span the entire range
        { startDate: { $lte: start }, endDate: { $gte: end } }
      ]
    });
    
    // Prepare calendar data
    const calendar = {};
    
    // Generate dates in the range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      calendar[dateStr] = { available: true, bookings: [] };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Mark booked dates
    bookings.forEach(booking => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      
      const current = new Date(bookingStart);
      while (current <= bookingEnd) {
        const dateStr = current.toISOString().split('T')[0];
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

    // Prepare special dates arrays for frontend compatibility
    const specialDatesType1 = [];
    const specialDatesType2 = [];
    
    specialDates.forEach(specialDate => {
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
    });
    
    res.status(200).json({
      success: true,
      data: {
        calendar,
        specialDates: {
          type1: specialDatesType1,
          type2: specialDatesType2
        }
      }
    });
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
    
    // Get user's ownership percentage
    const asset = await Asset.findById(assetId);
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

    // Compute allocation window using ownership anniversary
    const { windowStart, windowEnd } = computeAllocationWindow(userOwnership.since || new Date());
    
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
    
    // Get regular bookings in the allocation window (excluding cancelled ones, except short-term cancelled which still count)
    const regularBookings = await Booking.find({
      user: userId,
      asset: assetId,
      $or: [
        { status: { $ne: 'cancelled' } },
        { status: 'cancelled', shortTermCancelled: true }
      ],
      startDate: { $gte: windowStart },
      endDate: { $lte: windowEnd }
    });
    
    // Get universal special dates for the window span (could cross years)
    const startY = windowStart.getFullYear();
    const endY = windowEnd.getFullYear();
    const years = startY === endY ? [startY] : [startY, endY];
    const specialDates = await SpecialDate.find({
      year: { $in: years },
      asset: null
    });
    
    // Calculate special date usage
    // Each booking that overlaps with a special date counts as using one allocation
    regularBookings.forEach(booking => {
      if (booking.status === 'confirmed') {
        const bookingStart = new Date(booking.startDate);
        const bookingEnd = new Date(booking.endDate);
        
        // Track which special date types this booking overlaps with (to avoid double counting)
        const overlappedTypes = new Set();
        
        // Check overlap with special dates
        specialDates.forEach(specialDate => {
          const specialStart = new Date(specialDate.startDate);
          const specialEnd = new Date(specialDate.endDate);
          
          // Check if booking overlaps with special date (even one day counts)
          if (bookingStart <= specialEnd && bookingEnd >= specialStart) {
            overlappedTypes.add(specialDate.type);
          }
        });
        
        // Count each type only once per booking
        if (overlappedTypes.has('type1')) {
          specialDateAllocation.type1.used++;
        }
        if (overlappedTypes.has('type2')) {
          specialDateAllocation.type2.used++;
        }
      }
    });
    
    // Ensure used doesn't exceed total (in case of overlapping bookings)
    specialDateAllocation.type1.used = Math.min(specialDateAllocation.type1.used, specialDateAllocation.type1.total);
    specialDateAllocation.type2.used = Math.min(specialDateAllocation.type2.used, specialDateAllocation.type2.total);
    
    // Get active bookings (including future years, excluding cancelled except short-term cancelled ones)
    const now = new Date();
    const activeBookings = await Booking.find({
      user: userId,
      asset: assetId,
      $or: [
        { status: { $ne: 'cancelled' } },
        { status: 'cancelled', shortTermCancelled: true } // Include short-term cancelled bookings that still count
      ],
      endDate: { $gte: now }
    }).sort({ startDate: 1 });
    
    // Calculate days booked from standard allocation
    const regularDaysBooked = regularBookings
      .filter(booking => !booking.isExtraDays)
      .reduce((total, booking) => {
        const days = calculateBookingDays(booking.startDate, booking.endDate);
        return total + days;
      }, 0);
    
    // Calculate extra days used
    const extraDaysUsed = regularBookings
      .filter(booking => booking.isExtraDays)
      .reduce((total, booking) => {
        const days = calculateBookingDays(booking.startDate, booking.endDate);
        return total + days;
      }, 0);
    
    // Count active bookings, considering short-term cancelled ones
    const activeBookingsCount = activeBookings.length;
    
    // Get the count of short-term cancelled bookings that still count against allocation
    const shortTermCancelledBookingsCount = activeBookings.filter(
      booking => booking.status === 'cancelled' && booking.shortTermCancelled
    ).length;
    
    res.status(200).json({
      success: true,
      data: {
        sharePercentage,
        allowedDaysPerYear,
        daysBooked: regularDaysBooked,
        daysRemaining: allowedDaysPerYear - regularDaysBooked,
        extraAllowedDays,
        extraDaysUsed,
        extraDaysRemaining: extraAllowedDays - extraDaysUsed,
        activeBookings: activeBookingsCount,
        maxActiveBookings,
        activeBookingsRemaining: maxActiveBookings - activeBookingsCount,
        maxStayLength: calculateMaxConsecutiveDays(sharePercentage),
        standardBookingLength: STANDARD_BOOKING_LENGTH,
        maxAdvanceBookingYears: MAX_ADVANCE_BOOKING_YEARS,
        shortTermCancelledBookings: shortTermCancelledBookingsCount,
        specialDates: specialDateAllocation,
        currentBookings: regularBookings.map(b => ({
          id: b._id,
          startDate: b.startDate,
          endDate: b.endDate,
          status: b.status,
          isShortTerm: b.isShortTerm,
          shortTermCancelled: b.shortTermCancelled,
          days: calculateBookingDays(b.startDate, b.endDate)
        })),
        futureBookings: activeBookings.map(b => ({
          id: b._id,
          startDate: b.startDate,
          endDate: b.endDate,
          status: b.status,
          isShortTerm: b.isShortTerm,
          shortTermCancelled: b.shortTermCancelled,
          days: calculateBookingDays(b.startDate, b.endDate)
        })),
        allocationWindow: {
          start: windowStart,
          end: windowEnd
        }
      }
    });
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

// @desc    Create special dates
// @route   POST /api/bookings/special-dates
// @access  Private (Admin only)
exports.createSpecialDates = async (req, res) => {
  try {
    const { assetId, dates } = req.body;
    
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of special dates'
      });
    }
    
    // Validate dates
    for (const date of dates) {
      if (!date.type || !['type1', 'type2'].includes(date.type)) {
        return res.status(400).json({
          success: false,
          error: 'Special date type must be "type1" or "type2"'
        });
      }
      
      if (!date.startDate || !date.endDate || !date.year) {
        return res.status(400).json({
          success: false,
          error: 'Each special date must include startDate, endDate, and year'
        });
      }
      
      // Ensure dates are not overlapping within the same type (universal or per asset)
      const query = {
        type: date.type,
        year: date.year
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
            error: `Special date overlaps with existing ${date.type} special date for ${date.year}`
          });
        }
      }
    }
    
    // Create special dates (assetId optional; null means universal)
    const specialDates = await SpecialDate.insertMany(
      dates.map(date => ({
        asset: assetId || null,
        type: date.type,
        startDate: date.startDate,
        endDate: date.endDate,
        year: date.year,
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

// @desc    Reassign cancelled short-term booking when another owner books the dates
// @access  Private (Internal function used by createBooking)
const reassignCancelledShortTermBooking = async (userId, assetId, startDate, endDate) => {
  // Find cancelled short-term bookings by other users that overlap with these dates
  const bookingStart = new Date(startDate);
  const bookingEnd = new Date(endDate);
  
  const cancelledShortTermBookings = await Booking.find({
    asset: assetId,
    user: { $ne: userId }, // Not by the current user
    status: 'cancelled',
    shortTermCancelled: true,
    $or: [
      // New booking starts during a cancelled booking
      { startDate: { $lte: bookingStart }, endDate: { $gte: bookingStart } },
      // New booking ends during a cancelled booking
      { startDate: { $lte: bookingEnd }, endDate: { $gte: bookingEnd } },
      // New booking completely contains a cancelled booking
      { startDate: { $gte: bookingStart }, endDate: { $lte: bookingEnd } }
    ]
  });
  
  // If there are cancelled short-term bookings that overlap, update them to not count against allocation
  for (const cancelledBooking of cancelledShortTermBookings) {
    cancelledBooking.shortTermCancelled = false; // No longer counts against allocation
    cancelledBooking.reassignedTo = userId;
    cancelledBooking.reassignedAt = new Date();
    await cancelledBooking.save();
  }
  
  return cancelledShortTermBookings.length;
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
        booking,
        payment: {
          amount: paymentAmount,
          status: 'paid',
          date: booking.paymentDate
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
      .populate('asset', 'name location type description capacity amenities')
      .sort({ startDate: 1 }); // Sort by start date ascending
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    console.error('Error fetching asset bookings:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 