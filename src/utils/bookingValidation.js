import { differenceInDays, isBefore, isAfter, addDays, isSameDay } from 'date-fns';

/**
 * Comprehensive booking validation utility
 * Implements all business rules from the backend
 */

// Constants from business rules
const BOOKING_CONSTANTS = {
  SHORT_TERM_THRESHOLD_BOAT: 30, // days
  SHORT_TERM_THRESHOLD_HOME: 60, // days
  VERY_SHORT_TERM_THRESHOLD: 7, // days
  MAX_CONTINUOUS_STAY: 14, // days
  STANDARD_BOOKING_LENGTH: 7, // days
  MIN_GAP_BETWEEN_BOOKINGS: 3, // days (for regular bookings) - NOTE: actual gap equals length of previous booking
  MAX_ADVANCE_BOOKING_DAYS: 365, // 1 year
};

const BOOKING_TYPES = {
  REGULAR: 'Regular',
  SHORT_TERM: 'Short',
  VERY_SHORT_TERM: 'VeryShort'
};

/**
 * Determine booking type based on asset type and advance notice
 */
export const determineBookingType = (startDate, assetType) => {
  const today = new Date();
  const daysInAdvance = differenceInDays(startDate, today);
  
  const shortTermThreshold = assetType === 'boat' 
    ? BOOKING_CONSTANTS.SHORT_TERM_THRESHOLD_BOAT 
    : BOOKING_CONSTANTS.SHORT_TERM_THRESHOLD_HOME;
  
  if (daysInAdvance < BOOKING_CONSTANTS.VERY_SHORT_TERM_THRESHOLD) {
    return BOOKING_TYPES.VERY_SHORT_TERM;
  } else if (daysInAdvance < shortTermThreshold) {
    return BOOKING_TYPES.SHORT_TERM;
  } else {
    return BOOKING_TYPES.REGULAR;
  }
};

/**
 * Validate booking dates and length
 */
export const validateBookingDates = (startDate, endDate, assetType, bookingType) => {
  const errors = [];
  
  // Basic date validation
  if (!startDate || !endDate) {
    errors.push('Start date and end date are required');
    return { isValid: false, errors };
  }
  
  if (isBefore(endDate, startDate) || isSameDay(startDate, endDate)) {
    errors.push('End date must be after start date');
    return { isValid: false, errors };
  }
  
  const today = new Date();
  if (isBefore(startDate, today)) {
    errors.push('Cannot book dates in the past');
    return { isValid: false, errors };
  }
  
  // Check maximum advance booking
  const daysInAdvance = differenceInDays(startDate, today);
  if (daysInAdvance > BOOKING_CONSTANTS.MAX_ADVANCE_BOOKING_DAYS) {
    errors.push(`Cannot book more than ${BOOKING_CONSTANTS.MAX_ADVANCE_BOOKING_DAYS} days in advance`);
  }
  
  // Validate booking length - use same calculation as backend
  const bookingLength = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  console.log('📊 Booking length calculation:', {
    startDate: startDate.toDateString(),
    endDate: endDate.toDateString(),
    startTime: startDate.getTime(),
    endTime: endDate.getTime(),
    timeDiff: endDate.getTime() - startDate.getTime(),
    bookingLength
  });
  
  // Maximum continuous stay rule
  if (bookingLength > BOOKING_CONSTANTS.MAX_CONTINUOUS_STAY) {
    errors.push(`Maximum continuous stay is ${BOOKING_CONSTANTS.MAX_CONTINUOUS_STAY} days`);
  }
  
  // Very short-term bookings must be short
  if (bookingType === BOOKING_TYPES.VERY_SHORT_TERM && bookingLength > BOOKING_CONSTANTS.VERY_SHORT_TERM_THRESHOLD) {
    errors.push(`Very short-term bookings cannot exceed ${BOOKING_CONSTANTS.VERY_SHORT_TERM_THRESHOLD} days`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    bookingLength,
    daysInAdvance
  };
};

/**
 * Check for gap rules between bookings (only for regular bookings)
 */
export const validateGapRules = (startDate, endDate, existingBookings, bookingType) => {
  const errors = [];
  
  // Gap rules only apply to regular bookings
  if (bookingType !== BOOKING_TYPES.REGULAR) {
    return { isValid: true, errors: [] };
  }
  
  // Check gaps with existing bookings
  existingBookings.forEach(booking => {
    const bookingStart = new Date(booking.startDate);
    const bookingEnd = new Date(booking.endDate);
    const existingBookingLength = Math.ceil(
      (bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Skip if it's the same booking (for editing)
    if (booking._id && booking._id === booking.editingId) {
      return;
    }
    
    // Check gap before existing booking
    const daysBefore = Math.ceil(
      (bookingStart.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysBefore > 0 && daysBefore < existingBookingLength) {
      errors.push(`Gap of ${existingBookingLength} days required before existing ${existingBookingLength}-day booking on ${bookingStart.toDateString()}. Current gap: ${daysBefore} days.`);
    }
    
    // Check gap after existing booking
    const daysAfter = Math.ceil(
      (startDate.getTime() - bookingEnd.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysAfter > 0 && daysAfter < existingBookingLength) {
      errors.push(`Gap of ${existingBookingLength} days required after existing ${existingBookingLength}-day booking ending ${bookingEnd.toDateString()}. Current gap: ${daysAfter} days.`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate ownership allocation rules
 */
export const validateOwnershipAllocation = (userId, userOwnership, bookingLength, bookingType, assetType, userBookingsThisYear, specialDates, startDate, endDate) => {
  const errors = [];
  const warnings = [];
  
  if (!userOwnership || userOwnership.sharePercentage === 0) {
    errors.push('You do not have ownership in this asset');
    return { isValid: false, errors, warnings };
  }
  
  // Calculate annual allocation
  const daysInYear = 365;
  const allocatedDays = Math.floor((userOwnership.sharePercentage / 100) * daysInYear);
  
  // Calculate used days this year
  const currentYear = new Date().getFullYear();
  const usedDays = userBookingsThisYear
    .filter(booking => new Date(booking.startDate).getFullYear() === currentYear)
    .reduce((total, booking) => {
      return total + Math.ceil(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }, 0);
  
  const remainingDays = allocatedDays - usedDays;
  
  // For regular bookings, check allocation
  if (bookingType === BOOKING_TYPES.REGULAR) {
    if (bookingLength > remainingDays) {
      errors.push(`Insufficient allocation. You have ${remainingDays} days remaining of your ${allocatedDays} annual allocation.`);
    }
  }
  
  // For very short-term bookings, always use extra days
  if (bookingType === BOOKING_TYPES.VERY_SHORT_TERM) {
    warnings.push('This very short-term booking will use extra days allocation and incur additional charges.');
  }
  
  // Check special dates restrictions
  const bookingStart = startDate;
  const bookingEnd = endDate;
  
  specialDates.forEach(specialDate => {
    const specialStart = new Date(specialDate.startDate);
    const specialEnd = new Date(specialDate.endDate);
    
    // Check if booking overlaps with special dates
    const overlaps = (bookingStart <= specialEnd && bookingEnd >= specialStart);
    
    if (overlaps) {
      if (specialDate.type === 'maintenance') {
        errors.push(`Asset is under maintenance during selected dates (${specialStart.toDateString()} - ${specialEnd.toDateString()})`);
      } else if (specialDate.type === 'peak') {
        warnings.push(`Peak season dates selected. Special rules and rates may apply.`);
      } else if (specialDate.type === 'holiday') {
        if (bookingType === BOOKING_TYPES.REGULAR) {
          warnings.push(`Holiday period selected. Consider booking well in advance.`);
        }
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    allocationInfo: {
      allocatedDays,
      usedDays,
      remainingDays,
      bookingLength
    }
  };
};

/**
 * Comprehensive booking validation
 */
export const validateBooking = async (bookingData, userData, assetData, existingBookings, userBookingsThisYear, specialDates) => {
  const { startDate, endDate } = bookingData;
  const { type: assetType } = assetData;
  
  // Determine booking type
  const bookingType = determineBookingType(startDate, assetType);
  
  // Find user's ownership in this asset
  const userOwnership = assetData.owners?.find(owner => 
    owner.user === userData._id || owner.user._id === userData._id
  );
  
  // Validate dates and length
  const dateValidation = validateBookingDates(startDate, endDate, assetType, bookingType);
  if (!dateValidation.isValid) {
    return {
      isValid: false,
      errors: dateValidation.errors,
      warnings: [],
      bookingType,
      allocationInfo: null
    };
  }
  
  // Validate gap rules
  const gapValidation = validateGapRules(startDate, endDate, existingBookings, bookingType);
  
  // Validate ownership allocation
  const allocationValidation = validateOwnershipAllocation(
    userData._id,
    userOwnership,
    dateValidation.bookingLength,
    bookingType,
    assetType,
    userBookingsThisYear,
    specialDates,
    startDate,
    endDate
  );
  
  // Combine all validation results
  const allErrors = [
    ...dateValidation.errors,
    ...gapValidation.errors,
    ...allocationValidation.errors
  ];
  
  const allWarnings = [
    ...allocationValidation.warnings
  ];
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    bookingType,
    allocationInfo: allocationValidation.allocationInfo,
    daysInAdvance: dateValidation.daysInAdvance
  };
};

/**
 * Check if booking overlaps with special dates
 */
export const checkSpecialDateOverlap = (startDate, endDate, specialDates) => {
  if (!specialDates || (!specialDates.type1?.length && !specialDates.type2?.length)) {
    return { hasSpecialDates: false, types: [] };
  }

  const bookingStart = new Date(startDate);
  const bookingEnd = new Date(endDate);
  const overlappingTypes = [];

  // Check Type 1 special dates
  if (specialDates.type1?.length > 0) {
    const hasType1Overlap = specialDates.type1.some(dateStr => {
      const specialDate = new Date(dateStr);
      return specialDate >= bookingStart && specialDate < bookingEnd;
    });
    if (hasType1Overlap) {
      overlappingTypes.push('type1');
    }
  }

  // Check Type 2 special dates
  if (specialDates.type2?.length > 0) {
    const hasType2Overlap = specialDates.type2.some(dateStr => {
      const specialDate = new Date(dateStr);
      return specialDate >= bookingStart && specialDate < bookingEnd;
    });
    if (hasType2Overlap) {
      overlappingTypes.push('type2');
    }
  }

  return {
    hasSpecialDates: overlappingTypes.length > 0,
    types: overlappingTypes
  };
};

/**
 * Get booking type display information based on business rules
 */
export const getBookingTypeInfo = (bookingType, daysInAdvance, specialDateInfo = null, assetType = 'home') => {
  // First check if this is a special date booking
  if (specialDateInfo && specialDateInfo.hasSpecialDates) {
    const specialTypes = specialDateInfo.types.join(' & ');
    return {
      type: 'Special',
      title: 'Special Date Booking',
      description: `Booking includes ${specialTypes.replace('type1', 'Type 1').replace('type2', 'Type 2')} special dates`,
      badge: 'Special',
      badgeColor: '#9B59B6'
    };
  }

  // Get asset-specific threshold
  const shortTermThreshold = assetType === 'boat' 
    ? BOOKING_CONSTANTS.SHORT_TERM_THRESHOLD_BOAT 
    : BOOKING_CONSTANTS.SHORT_TERM_THRESHOLD_HOME;

  // Then determine based on advance notice period
  switch (bookingType) {
    case BOOKING_TYPES.VERY_SHORT_TERM:
      return {
        type: bookingType,
        title: 'Last Minute Booking',
        description: `Booking only ${daysInAdvance} days in advance (less than 7 days) - Uses extra days allocation with additional cost`,
        badge: 'Last Minute',
        badgeColor: '#FF6B6B'
      };
    case BOOKING_TYPES.SHORT_TERM:
      return {
        type: bookingType,
        title: 'Short Term Booking',
        description: `Booking ${daysInAdvance} days in advance (7-${shortTermThreshold} days) - Flexible gap rules, uses standard allocation`,
        badge: 'Short Term',
        badgeColor: '#4ECDC4'
      };
    case BOOKING_TYPES.REGULAR:
      return {
        type: bookingType,
        title: 'Long Term Booking',
        description: `Booking ${daysInAdvance} days in advance (more than ${shortTermThreshold} days) - Standard gap rules apply`,
        badge: 'Long Term',
        badgeColor: '#45B7D1'
      };
    default:
      return {
        type: bookingType,
        title: 'Booking',
        description: '',
        badge: '',
        badgeColor: '#45B7D1'
      };
  }
}; 