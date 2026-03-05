import fs from 'node:fs';
import path from 'node:path';

const fixturesPath = path.join(__dirname, '../../../tests/date-contract/fixtures/date-contract-fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

const toDateOnly = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

describe('Admin date contract matrix', () => {
  test.each(fixtures)('fixture $scenarioId remains date-stable through local parsing', (fixture: any) => {
    const parsed = new Date(`${fixture.inputDate}T00:00:00`);
    expect(toDateOnly(parsed)).toBe(fixture.expectedApiDate);
  });
});
