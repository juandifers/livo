/**
 * Centralized Date Utilities for Backend
 * Provides consistent date handling across the application
 */

class DateUtils {
  /**
   * Normalize any date input to YYYY-MM-DD format
   * @param {Date|string|null} input - Date object, ISO string, or YYYY-MM-DD string
   * @returns {string|null} - Normalized date string in YYYY-MM-DD format
   */
  static normalize(input) {
    if (!input) return null;
    
    let date;
    
    try {
      if (input instanceof Date) {
        date = input;
      } else if (typeof input === 'string') {
        // Handle ISO format (2026-02-20T23:00:00.000Z)
        if (input.includes('T')) {
          date = new Date(input.split('T')[0] + 'T00:00:00');
        } 
        // Handle YYYY-MM-DD format
        else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
          date = new Date(input + 'T00:00:00');
        }
        // Try to parse as-is
        else {
          date = new Date(input);
        }
      } else {
        throw new Error(`Invalid date input type: ${typeof input}`);
      }
      
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${input}`);
      }
      
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } catch (error) {
      throw new Error(`Date normalization failed for input "${input}": ${error.message}`);
    }
  }

  /**
   * Convert normalized date string to Date object for database operations
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {Date} - Date object
   */
  static toDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00.000Z'); // Use UTC to avoid timezone issues
  }

  /**
   * Parse API input date safely
   * @param {any} input - Date input from API
   * @returns {Date} - Parsed Date object
   */
  static parseApiDate(input) {
    if (!input) {
      throw new Error('Date input is required');
    }
    
    const normalized = DateUtils.normalize(input);
    if (!normalized) {
      throw new Error(`Invalid date input: ${input}`);
    }
    
    return DateUtils.toDate(normalized);
  }

  /**
   * Calculate booking duration in days (inclusive of both start and end dates)
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {number} - Number of days
   */
  static calculateBookingDays(startDate, endDate) {
    const start = DateUtils.parseApiDate(startDate);
    const end = DateUtils.parseApiDate(endDate);
    
    if (!start || !end) {
      throw new Error('Invalid dates provided for booking calculation');
    }
    
    // Add 1 to include both start and end dates
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Check if a date is in the past
   * @param {Date|string} date - Date to check
   * @returns {boolean} - True if date is in the past
   */
  static isPast(date) {
    const checkDate = DateUtils.parseApiDate(date);
    const now = new Date();
    return checkDate < now;
  }

  /**
   * Check if a date is in the future
   * @param {Date|string} date - Date to check
   * @returns {boolean} - True if date is in the future
   */
  static isFuture(date) {
    const checkDate = DateUtils.parseApiDate(date);
    const now = new Date();
    return checkDate > now;
  }

  /**
   * Get the year from a date
   * @param {Date|string} date - Date to extract year from
   * @returns {number} - Year
   */
  static getYear(date) {
    const parsedDate = DateUtils.parseApiDate(date);
    return parsedDate.getFullYear();
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
      startStr: DateUtils.normalize(startDate),
      endStr: DateUtils.normalize(endDate)
    };
  }

  /**
   * Get current year range
   * @returns {Object} - Current year date range
   */
  static getCurrentYearRange() {
    return DateUtils.getYearRange(new Date().getFullYear());
  }

  /**
   * Get next year range
   * @returns {Object} - Next year date range
   */
  static getNextYearRange() {
    return DateUtils.getYearRange(new Date().getFullYear() + 1);
  }

  /**
   * Check if two dates are the same day
   * @param {Date|string} date1 - First date
   * @param {Date|string} date2 - Second date
   * @returns {boolean} - True if same day
   */
  static isSameDay(date1, date2) {
    const d1 = DateUtils.parseApiDate(date1);
    const d2 = DateUtils.parseApiDate(date2);
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  /**
   * Check if a date falls within a range (inclusive)
   * @param {Date|string} date - Date to check
   * @param {Date|string} startDate - Range start
   * @param {Date|string} endDate - Range end
   * @returns {boolean} - True if date is within range
   */
  static isWithinRange(date, startDate, endDate) {
    const checkDate = DateUtils.parseApiDate(date);
    const start = DateUtils.parseApiDate(startDate);
    const end = DateUtils.parseApiDate(endDate);
    
    return checkDate >= start && checkDate <= end;
  }

  /**
   * Safe date parsing with fallback
   * @param {any} input - Date input
   * @param {any} fallback - Fallback value if parsing fails
   * @returns {any} - Parsed date or fallback
   */
  static safeParse(input, fallback = null) {
    try {
      return DateUtils.parseApiDate(input);
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
      const parsed = DateUtils.parseApiDate(input);
      
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
    return DateUtils.normalize(date);
  }

  /**
   * Get date range for yearly allocation windows
   * @param {number|null} year - Year to get range for (null = current year)
   * @returns {Object} - Yearly allocation windows
   */
  static getYearlyAllocationWindows(year = null) {
    const targetYear = year || new Date().getFullYear();
    
    return {
      currentYear: DateUtils.getYearRange(targetYear),
      nextYear: DateUtils.getYearRange(targetYear + 1)
    };
  }
}

module.exports = DateUtils;
