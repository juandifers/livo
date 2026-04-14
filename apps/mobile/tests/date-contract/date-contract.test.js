import fs from 'node:fs';

import DateUtils from '../../src/utils/dateUtils';

const fixturesPath = require.resolve('@livo/contracts/src/fixtures/date-contract-fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

describe('Mobile date contract (timezone matrix compatible)', () => {
  test.each(fixtures)('fixture $scenarioId stays stable through parse/format', (fixture) => {
    const roundtrip = DateUtils.toApiFormat(DateUtils.parseDate(fixture.inputDate));
    expect(roundtrip).toBe(fixture.expectedApiDate);
  });
});
