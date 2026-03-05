import { determineBookingType } from '../../src/utils/bookingValidation';

const plusDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

describe('Mobile booking threshold parity', () => {
  test('home threshold keeps 45-day lead as Short', () => {
    expect(determineBookingType(plusDays(45), 'home')).toBe('Short');
  });

  test('boat threshold keeps 45-day lead as Regular', () => {
    expect(determineBookingType(plusDays(45), 'boat')).toBe('Regular');
  });

  test('very-short threshold applies at 7 days', () => {
    expect(determineBookingType(plusDays(7), 'home')).toBe('VeryShort');
    expect(determineBookingType(plusDays(7), 'boat')).toBe('VeryShort');
  });
});
