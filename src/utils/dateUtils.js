/**
 * Centralized Date Utilities for Frontend (React Native)
 * Provides consistent date handling across the application
 */

import { format, isSameDay, isBefore, isAfter, differenceInDays, addDays, startOfDay } from 'date-fns';

class DateUtils {
  /**
   * Parse any date input to a Date object
   * @param {Date|string|null} input - Date object, ISO string, or YYYY-MM-DD string
   * @returns {Date|null} - Parsed Date object
   */
  static parseDate(input) {
    if (!input) return null;
    
    if (input instanceof Date) {
      return input;
    }
    
    if (typeof input === 'string') {
      // Handle ISO format (2026-02-20T23:00:00.000Z)
      if (input.includes('T')) {
        return new Date(input.split('T')[0] + 'T00:00:00');
      }
      // Handle YYYY-MM-DD format
      else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return new Date(input + 'T00:00:00');
      }
      // Try to parse as-is
      else {
        return new Date(input);
      }
    }
    
    throw new Error(`Invalid date input type: ${typeof input}`);
  }

  /**
   * Convert Date object to YYYY-MM-DD format for API calls
   * @param {Date} date - Date object
   * @returns {string} - Date string in YYYY-MM-DD format
   */
  static toApiFormat(date) {
    if (!date) return null;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Convert Date object to ISO string for API calls
   * @param {Date} date - Date object
   * @returns {string} - ISO date string
   */
  static toISOFormat(date) {
    if (!date) return null;
    return new Date(date).toISOString();
  }

  /**
   * Calculate booking duration in days (inclusive of both start and end dates)
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {number} - Number of days
   */
  static calculateBookingDays(startDate, endDate) {
    const start = DateUtils.parseDate(startDate);
    const end = DateUtils.parseDate(endDate);
    
    // Add 1 to include both start and end dates
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Check if a date is in the past
   * @param {Date|string} date - Date to check
   * @returns {boolean} - True if date is in the past
   */
  static isPast(date) {
    const checkDate = DateUtils.parseDate(date);
    const today = startOfDay(new Date());
    return isBefore(checkDate, today);
  }

  /**
   * Check if a date is in the future
   * @param {Date|string} date - Date to check
   * @returns {boolean} - True if date is in the future
   */
  static isFuture(date) {
    const checkDate = DateUtils.parseDate(date);
    const today = startOfDay(new Date());
    return isAfter(checkDate, today);
  }

  /**
   * Check if a date is today
   * @param {Date|string} date - Date to check
   * @returns {boolean} - True if date is today
   */
  static isToday(date) {
    const checkDate = DateUtils.parseDate(date);
    const today = startOfDay(new Date());
    return isSameDay(checkDate, today);
  }

  /**
   * Get the year from a date
   * @param {Date|string} date - Date to extract year from
   * @returns {number} - Year
   */
  static getYear(date) {
    const parsedDate = DateUtils.parseDate(date);
    return parsedDate.getFullYear();
  }

  /**
   * Get current year
   * @returns {number} - Current year
   */
  static getCurrentYear() {
    return new Date().getFullYear();
  }

  /**
   * Get next year
   * @returns {number} - Next year
   */
  static getNextYear() {
    return new Date().getFullYear() + 1;
  }

  /**
   * Create date range for a specific year (January 1st to December 31st)
   * @param {number} year - Year to create range for
   * @returns {Object} - Object with start and end dates
   */
  static getYearRange(year) {
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31); // December 31st
    
    return {
      start: startDate,
      end: endDate,
      startStr: DateUtils.toApiFormat(startDate),
      endStr: DateUtils.toApiFormat(endDate)
    };
  }

  /**
   * Get current year range
   * @returns {Object} - Current year date range
   */
  static getCurrentYearRange() {
    return DateUtils.getYearRange(DateUtils.getCurrentYear());
  }

  /**
   * Get next year range
   * @returns {Object} - Next year date range
   */
  static getNextYearRange() {
    return DateUtils.getYearRange(DateUtils.getNextYear());
  }

  /**
   * Check if two dates are the same day
   * @param {Date|string} date1 - First date
   * @param {Date|string} date2 - Second date
   * @returns {boolean} - True if same day
   */
  static isSameDay(date1, date2) {
    const d1 = DateUtils.parseDate(date1);
    const d2 = DateUtils.parseDate(date2);
    return isSameDay(d1, d2);
  }

  /**
   * Check if a date falls within a range (inclusive)
   * @param {Date|string} date - Date to check
   * @param {Date|string} startDate - Range start
   * @param {Date|string} endDate - Range end
   * @returns {boolean} - True if date is within range
   */
  static isWithinRange(date, startDate, endDate) {
    const checkDate = DateUtils.parseDate(date);
    const start = DateUtils.parseDate(startDate);
    const end = DateUtils.parseDate(endDate);
    
    return checkDate >= start && checkDate <= end;
  }

  /**
   * Calculate days between two dates
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {number} - Number of days between dates
   */
  static daysBetween(startDate, endDate) {
    const start = DateUtils.parseDate(startDate);
    const end = DateUtils.parseDate(endDate);
    return differenceInDays(end, start);
  }

  /**
   * Add days to a date
   * @param {Date|string} date - Base date
   * @param {number} days - Number of days to add
   * @returns {Date} - New date with days added
   */
  static addDays(date, days) {
    const baseDate = DateUtils.parseDate(date);
    return addDays(baseDate, days);
  }

  /**
   * Format date for display
   * @param {Date|string} date - Date to format
   * @param {string} formatStr - Format string (default: 'MMM dd, yyyy')
   * @returns {string} - Formatted date string
   */
  static formatDate(date, formatStr = 'MMM dd, yyyy') {
    const parsedDate = DateUtils.parseDate(date);
    return format(parsedDate, formatStr);
  }

  /**
   * Safe date parsing with fallback
   * @param {any} input - Date input
   * @param {any} fallback - Fallback value if parsing fails
   * @returns {any} - Parsed date or fallback
   */
  static safeParse(input, fallback = null) {
    try {
      return DateUtils.parseDate(input);
    } catch (error) {
      console.warn(`Date parsing failed for ${input}:`, error.message);
      return fallback;
    }
  }

  /**
   * Validate date input and throw descriptive errors
   * @param {any} input - Date input to validate
   * @param {string} fieldName - Name of the field for error messages
   * @returns {Date} - Validated Date object
   */
  static validate(input, fieldName = 'Date') {
    if (!input) {
      throw new Error(`${fieldName} is required`);
    }
    
    try {
      const parsed = DateUtils.parseDate(input);
      
      if (isNaN(parsed.getTime())) {
        throw new Error(`${fieldName} is not a valid date`);
      }
      
      return parsed;
    } catch (error) {
      throw new Error(`${fieldName} validation failed: ${error.message}`);
    }
  }

  /**
   * Format date for API response (YYYY-MM-DD)
   * @param {Date|string} date - Date to format
   * @returns {string} - Formatted date string
   */
  static formatForApi(date) {
    return DateUtils.toApiFormat(date);
  }

  /**
   * Get date range for yearly allocation windows
   * @param {number|null} year - Year to get range for (null = current year)
   * @returns {Object} - Yearly allocation windows
   */
  static getYearlyAllocationWindows(year = null) {
    const targetYear = year || DateUtils.getCurrentYear();
    
    return {
      currentYear: DateUtils.getYearRange(targetYear),
      nextYear: DateUtils.getYearRange(targetYear + 1)
    };
  }

  /**
   * Parse booking dates from API response
   * @param {Object} booking - Booking object from API
   * @returns {Object} - Booking with parsed dates
   */
  static parseBookingDates(booking) {
    return {
      ...booking,
      startDate: DateUtils.parseDate(booking.startDate),
      endDate: DateUtils.parseDate(booking.endDate),
      createdAt: booking.createdAt ? DateUtils.parseDate(booking.createdAt) : null,
      cancelledAt: booking.cancelledAt ? DateUtils.parseDate(booking.cancelledAt) : null,
      reassignedAt: booking.reassignedAt ? DateUtils.parseDate(booking.reassignedAt) : null
    };
  }

  /**
   * Prepare booking data for API submission
   * @param {Object} bookingData - Booking data with Date objects
   * @returns {Object} - Booking data with formatted dates for API
   */
  static prepareBookingForApi(bookingData) {
    return {
      ...bookingData,
      startDate: DateUtils.toApiFormat(bookingData.startDate),
      endDate: DateUtils.toApiFormat(bookingData.endDate)
    };
  }

  /**
   * Get user's timezone
   * @returns {string} - User's timezone
   */
  static getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Convert UTC date to local date
   * @param {Date|string} utcDate - UTC date
   * @returns {Date} - Local date
   */
  static utcToLocal(utcDate) {
    const parsed = DateUtils.parseDate(utcDate);
    return new Date(parsed.getTime() + parsed.getTimezoneOffset() * 60000);
  }

  /**
   * Convert local date to UTC
   * @param {Date|string} localDate - Local date
   * @returns {Date} - UTC date
   */
  static localToUtc(localDate) {
    const parsed = DateUtils.parseDate(localDate);
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  }
}

export default DateUtils;
