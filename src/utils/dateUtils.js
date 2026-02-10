/**
 * Centralized Date Utilities for Backend
 * Provides consistent date handling across the application
 */

class DateUtils {
  /**
   * Format a Date instance as YYYY-MM-DD using UTC components (timezone-safe).
   * @param {Date} date
   * @returns {string}
   */
  static formatUtcDateOnly(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid Date provided');
    }
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  /**
   * Normalize any date input to YYYY-MM-DD format
   * @param {Date|string|null} input - Date object, ISO string, or YYYY-MM-DD string
   * @returns {string|null} - Normalized date string in YYYY-MM-DD format
   */
  static normalize(input) {
    if (!input) return null;
    
    try {
      // Date instance: format using UTC getters to avoid server timezone affecting date-only output.
      if (input instanceof Date) {
        return DateUtils.formatUtcDateOnly(input);
      }

      if (typeof input === 'string') {
        // If we already have YYYY-MM-DD, keep it (date-only contract).
        if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
          return input;
        }

        // ISO strings: prefer the date-part directly (timezone-safe).
        if (input.includes('T')) {
          const datePart = input.split('T')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            return datePart;
        }
        }

        // Fallback: parse as Date and format in UTC.
        const parsed = new Date(input);
        if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date: ${input}`);
      }
        return DateUtils.formatUtcDateOnly(parsed);
      }

      throw new Error(`Invalid date input type: ${typeof input}`);
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
    // Use UTC dates to match how booking/special dates are stored (UTC midnight).
    const startDate = new Date(Date.UTC(year, 0, 1)); // Jan 1 UTC
    const endDate = new Date(Date.UTC(year, 11, 31)); // Dec 31 UTC
    
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

  /**
   * Compute rolling 12-month windows anchored to an "anniversary date" (month/day).
   * Date-only semantics: all returned Dates are UTC midnight (timezone-safe).
   *
   * @param {Date|string} anchorDate - Date whose month/day define the anniversary anchor
   * @param {Date|string} refDate - Reference date (defaults to now)
   * @returns {{
   *   currentWindow: { start: Date, end: Date, startStr: string, endStr: string },
   *   nextWindow: { start: Date, end: Date, startStr: string, endStr: string }
   * }}
   */
  static getRollingAnniversaryWindows(anchorDate, refDate = new Date()) {
    const anchor = DateUtils.parseApiDate(anchorDate);
    // Normalize reference to date-only UTC midnight to avoid time-of-day ambiguity.
    const ref = DateUtils.parseApiDate(DateUtils.normalize(refDate));

    const anchorMonth = anchor.getUTCMonth(); // 0-based
    const anchorDay = anchor.getUTCDate(); // 1-based

    const clampMonthDayUtc = (year, month, day) => {
      // Attempt to construct requested month/day.
      const candidate = new Date(Date.UTC(year, month, day));
      // If JS rolled into the next month (e.g. Feb 29 on non-leap year), clamp to last day of month.
      if (candidate.getUTCMonth() !== month) {
        return new Date(Date.UTC(year, month + 1, 0));
      }
      return candidate;
    };

    const refYear = ref.getUTCFullYear();
    let windowStart = clampMonthDayUtc(refYear, anchorMonth, anchorDay);
    if (windowStart.getTime() > ref.getTime()) {
      windowStart = clampMonthDayUtc(refYear - 1, anchorMonth, anchorDay);
    }

    const startYear = windowStart.getUTCFullYear();
    const windowEnd = clampMonthDayUtc(startYear + 1, anchorMonth, anchorDay);

    const nextStart = windowEnd;
    const nextEnd = clampMonthDayUtc(startYear + 2, anchorMonth, anchorDay);

    return {
      currentWindow: {
        start: windowStart,
        end: windowEnd,
        startStr: DateUtils.normalize(windowStart),
        endStr: DateUtils.normalize(windowEnd)
      },
      nextWindow: {
        start: nextStart,
        end: nextEnd,
        startStr: DateUtils.normalize(nextStart),
        endStr: DateUtils.normalize(nextEnd)
      }
    };
  }
}

module.exports = DateUtils;
