// @livo/contracts — booking business rule constants
//
// Canonical values for LIVO's booking rules. ALL three apps must
// reference these constants. Do not inline these numbers anywhere.
//
// See docs/rules/rulesHOMES.md and docs/rules/rulesBOATS.md for the
// human-readable specification.

// Minimum stay (nights)
const MIN_STAY_HOME = 2;
const MIN_STAY_BOAT = 1;

// Maximum continuous stay (days)
const MAX_BOOKING_LENGTH = 14;

// Ownership share (1/8 share = 12.5%)
const VALID_OWNERSHIP_PERCENTAGES = [
  12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100,
];
const DAYS_PER_EIGHTH_SHARE = 44;
const EXTRA_DAYS_PER_EIGHTH = 10;
const EXTRA_DAY_COST = 100;

// Booking length tiers
const STANDARD_BOOKING_LENGTH = 7;
const VERY_SHORT_TERM_MAX_DAYS = 7;
const SHORT_TERM_MAX_DAYS_HOME = 60;
const SHORT_TERM_MAX_DAYS_BOAT = 30;

// Advance booking window
const MAX_ADVANCE_BOOKING_DAYS = 730; // 2 years

// Active booking caps (bookings longer than the short-term window)
const MAX_ACTIVE_BOOKINGS_PER_EIGHTH = 6;

module.exports = {
  MIN_STAY_HOME,
  MIN_STAY_BOAT,
  MAX_BOOKING_LENGTH,
  VALID_OWNERSHIP_PERCENTAGES,
  DAYS_PER_EIGHTH_SHARE,
  EXTRA_DAYS_PER_EIGHTH,
  EXTRA_DAY_COST,
  STANDARD_BOOKING_LENGTH,
  VERY_SHORT_TERM_MAX_DAYS,
  SHORT_TERM_MAX_DAYS_HOME,
  SHORT_TERM_MAX_DAYS_BOAT,
  MAX_ADVANCE_BOOKING_DAYS,
  MAX_ACTIVE_BOOKINGS_PER_EIGHTH,
};
