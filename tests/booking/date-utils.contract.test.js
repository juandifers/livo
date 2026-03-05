import fs from 'node:fs';
import path from 'node:path';
import DateUtils from '../../src/utils/dateUtils';

const fixturesPath = path.join(__dirname, '../../../tests/date-contract/fixtures/date-contract-fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

describe('Mobile date contract matrix', () => {
  test.each(fixtures)('fixture $scenarioId preserves API date contract', (fixture) => {
    const parsed = DateUtils.parseDate(fixture.inputDate);
    expect(DateUtils.toApiFormat(parsed)).toBe(fixture.expectedApiDate);

    const prepared = DateUtils.prepareBookingForApi({
      startDate: parsed,
      endDate: parsed
    });

    expect(prepared.startDate).toBe(fixture.expectedApiDate);
    expect(prepared.endDate).toBe(fixture.expectedApiDate);
  });
});
