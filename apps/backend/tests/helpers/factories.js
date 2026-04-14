const jwt = require('jsonwebtoken');
const config = require('../../src/config/config');
const User = require('../../src/models/User');
const Asset = require('../../src/models/Asset');
const Booking = require('../../src/models/Booking');
const SpecialDate = require('../../src/models/SpecialDate');

const dateOnlyOffset = (daysFromNow) => {
  const base = new Date();
  const utc = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() + daysFromNow);
  return utc.toISOString().split('T')[0];
};

const plusDaysFromDateOnly = (dateOnly, daysToAdd) => {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + daysToAdd);
  return utc.toISOString().split('T')[0];
};

const createUser = async (overrides = {}) => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return User.create({
    name: 'Test',
    lastName: 'User',
    email: `test-${suffix}@livo.com`,
    phoneNumber: '+10000000000',
    isActive: true,
    ...overrides
  });
};

const createAssetForOwner = async ({ ownerUserId, type = 'home', sharePercentage = 12.5, overrides = {} }) => {
  return Asset.create({
    name: `Asset-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    location: 'Test Location',
    owners: [
      {
        user: ownerUserId,
        sharePercentage,
        since: new Date()
      }
    ],
    ...overrides
  });
};

const createSpecialDate = async ({ type = 'type1', startDate, endDate, asset = null, repeatYearly = false, name = 'Special' }) => {
  return SpecialDate.create({
    type,
    name,
    startDate,
    endDate,
    asset,
    repeatYearly
  });
};

const createBookingRow = async ({ userId, assetId, startDate, endDate, status = 'confirmed', ...rest }) => {
  return Booking.create({
    user: userId,
    asset: assetId,
    startDate,
    endDate,
    status,
    ...rest
  });
};

const authHeader = (userId) => {
  const token = jwt.sign({ id: userId.toString() }, config.jwt.secret, { expiresIn: '1h' });
  return `Bearer ${token}`;
};

module.exports = {
  dateOnlyOffset,
  plusDaysFromDateOnly,
  createUser,
  createAssetForOwner,
  createSpecialDate,
  createBookingRow,
  authHeader
};
