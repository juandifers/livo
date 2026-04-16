import fs from 'node:fs';

type DateContractFixture = {
  scenarioId: string;
  inputDate: string;
  expectedApiDate: string;
  expectedDisplayDate: string;
  assetType: string;
};

const fixturesPath = require.resolve('@livo/contracts/src/fixtures/date-contract-fixtures.json');
const fixtures: DateContractFixture[] = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

const toDateOnly = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

describe('Admin date contract matrix', () => {
  test.each<DateContractFixture>(fixtures)('fixture $scenarioId remains date-stable through local parsing', (fixture) => {
    const parsed = new Date(`${fixture.inputDate}T00:00:00`);
    expect(toDateOnly(parsed)).toBe(fixture.expectedApiDate);
  });
});
