jest.mock('../../src/utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const fs = require('node:fs');

const request = require('supertest');
const app = require('../../src/app');
const DateUtils = require('../../src/utils/dateUtils');
const { createUser, createAssetForOwner, createBookingRow, authHeader } = require('../helpers/factories');

const fixturesPath = require.resolve('@livo/contracts/src/fixtures/date-contract-fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

describe('Date contract matrix (backend)', () => {
  test.each(fixtures)('fixture $scenarioId normalizes to canonical API date', (fixture) => {
    const normalized = DateUtils.normalize(fixture.inputDate);
    expect(normalized).toBe(fixture.expectedApiDate);

    const asDate = DateUtils.parseApiDate(fixture.inputDate);
    expect(DateUtils.formatForApi(asDate)).toBe(fixture.expectedApiDate);
  });

  test('GET /api/bookings/:id returns YYYY-MM-DD without timezone shifts', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'home' });

    const booking = await createBookingRow({
      userId: user._id,
      assetId: asset._id,
      startDate: '2026-03-08',
      endDate: '2026-03-09',
      status: 'confirmed'
    });

    const res = await request(app)
      .get(`/api/bookings/${booking._id.toString()}`)
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.data.startDate).toBe('2026-03-08');
    expect(res.body.data.endDate).toBe('2026-03-09');
    expect(res.body.data.startDate).not.toContain('T');
    expect(res.body.data.endDate).not.toContain('T');
  });

  test('GET /api/bookings list returns date-only contract for each booking row', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'boat' });

    await createBookingRow({
      userId: user._id,
      assetId: asset._id,
      startDate: '2026-11-01',
      endDate: '2026-11-01',
      status: 'confirmed'
    });

    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].startDate).toBe('2026-11-01');
    expect(res.body.data[0].endDate).toBe('2026-11-01');
    expect(res.body.data[0].startDate).not.toContain('T');
    expect(res.body.data[0].endDate).not.toContain('T');
  });
});
