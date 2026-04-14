// @livo/contracts — canonical business rules and fixtures

const bookingConstants = require('./booking-constants');

module.exports = {
  ...bookingConstants,
  dateContractFixtures: require('./fixtures/date-contract-fixtures.json'),
};
