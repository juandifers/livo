jest.mock('../../src/utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const request = require('supertest');
const app = require('../../src/app');
const {
  dateOnlyOffset,
  plusDaysFromDateOnly,
  createUser,
  createAssetForOwner,
  createSpecialDate,
  createBookingRow,
  authHeader
} = require('../helpers/factories');

const dateOnlyFromUtc = (year, month, day) =>
  new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];

const createBooking = async ({ token, assetId, startDate, endDate, userId }) =>
  request(app)
    .post('/api/bookings')
    .set('Authorization', token)
    .send({ assetId, startDate, endDate, ...(userId ? { userId } : {}) });

describe('Backend booking rules integration', () => {
  test('[RULE-HOME-002][block] blocks 1-day home booking', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'home' });
    const token = authHeader(user._id);
    const startDate = dateOnlyOffset(10);

    const res = await createBooking({ token, assetId: asset._id.toString(), startDate, endDate: startDate });

    expect(res.status).toBe(400);
    expect(String(res.body.error || '')).toMatch(/Minimum stay for home is 2 day/i);
  });

  test('[RULE-BOAT-002][allow] allows same-day boat booking', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'boat' });
    const token = authHeader(user._id);
    const startDate = dateOnlyOffset(10);

    const res = await createBooking({ token, assetId: asset._id.toString(), startDate, endDate: startDate });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('[RULE-HOME-003][block] blocks bookings more than 2 years ahead', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'home' });
    const token = authHeader(user._id);
    const startDate = dateOnlyOffset(760);
    const endDate = plusDaysFromDateOnly(startDate, 1);

    const res = await createBooking({ token, assetId: asset._id.toString(), startDate, endDate });

    expect(res.status).toBe(400);
    expect(String(res.body.error || '')).toMatch(/2 years/i);
  });

  test('[RULE-HOME-003][boundary] allows booking at the 2-year boundary', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'home' });
    const token = authHeader(user._id);

    const now = new Date();
    const boundaryEnd = new Date(Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth(), now.getUTCDate()));
    const endDate = boundaryEnd.toISOString().split('T')[0];
    // Home minimum stay is 2 days, so use a 2-day window that ends exactly at the boundary.
    const startDate = plusDaysFromDateOnly(endDate, -1);

    const res = await createBooking({ token, assetId: asset._id.toString(), startDate, endDate });

    expect(res.status).toBe(201);
  });

  test('[RULE-HOME-001][block] anniversary window allocation is enforced across calendar years', async () => {
    const user = await createUser();
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const ownerSince = new Date(Date.UTC(currentYear - 1, 6, 1)); // July 1 of previous year
    const asset = await createAssetForOwner({
      ownerUserId: user._id,
      type: 'home',
      sharePercentage: 12.5,
      overrides: {
        owners: [
          {
            user: user._id,
            sharePercentage: 12.5,
            since: ownerSince
          }
        ]
      }
    });
    const token = authHeader(user._id);

    const prefilledRanges = [
      [dateOnlyFromUtc(currentYear, 8, 1), dateOnlyFromUtc(currentYear, 8, 11)],
      [dateOnlyFromUtc(currentYear, 9, 1), dateOnlyFromUtc(currentYear, 9, 11)],
      [dateOnlyFromUtc(currentYear, 10, 1), dateOnlyFromUtc(currentYear, 10, 11)],
      [dateOnlyFromUtc(currentYear, 11, 1), dateOnlyFromUtc(currentYear, 11, 11)]
    ];

    for (const [startDate, endDate] of prefilledRanges) {
      await createBookingRow({
        userId: user._id,
        assetId: asset._id,
        startDate,
        endDate,
        status: 'confirmed'
      });
    }

    // Still within the same anniversary window (Jul currentYear -> Jun currentYear+1),
    // but crosses into a different calendar year.
    const startDate = dateOnlyFromUtc(currentYear + 1, 6, 29);
    const endDate = dateOnlyFromUtc(currentYear + 1, 6, 30);
    const res = await createBooking({ token, assetId: asset._id.toString(), startDate, endDate });

    expect(res.status).toBe(400);
    expect(String(res.body.error || '')).toMatch(/exceeds your allocation/i);
  });

  test('[RULE-HOME-017][allow] sets specialDateType on 1-day overlap', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'home' });
    const token = authHeader(user._id);

    const specialStart = dateOnlyOffset(95);
    const specialEnd = plusDaysFromDateOnly(specialStart, 2);
    await createSpecialDate({ type: 'type1', startDate: specialStart, endDate: specialEnd, asset: null });

    const startDate = plusDaysFromDateOnly(specialStart, 1);
    const endDate = plusDaysFromDateOnly(startDate, 1);

    const res = await createBooking({ token, assetId: asset._id.toString(), startDate, endDate });

    expect(res.status).toBe(201);
    const booking = res.body.data.bookings[0];
    expect(booking.specialDateType).toBe('type1');
  });

  test('[RULE-HOME-013][block] enforces minimum gap on long-term home bookings', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'home' });
    const token = authHeader(user._id);

    const firstStart = dateOnlyOffset(90);
    const firstEnd = plusDaysFromDateOnly(firstStart, 2);
    const first = await createBooking({ token, assetId: asset._id.toString(), startDate: firstStart, endDate: firstEnd });
    expect(first.status).toBe(201);

    const secondStart = plusDaysFromDateOnly(firstEnd, 2);
    const secondEnd = plusDaysFromDateOnly(secondStart, 1);
    const second = await createBooking({ token, assetId: asset._id.toString(), startDate: secondStart, endDate: secondEnd });

    expect(second.status).toBe(400);
    expect(String(second.body.error || '')).toMatch(/wait at least/i);
  });

  test('[RULE-HOME-021][allow] short-term cancellation applies penalty fields', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'home' });
    const token = authHeader(user._id);

    const startDate = dateOnlyOffset(10);
    const endDate = plusDaysFromDateOnly(startDate, 1);
    const created = await createBooking({ token, assetId: asset._id.toString(), startDate, endDate });
    expect(created.status).toBe(201);

    const bookingId = created.body.data.bookings[0]._id;
    const cancelled = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', token);

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.shortTermCancelled).toBe(true);
    expect(cancelled.body.data.remainingPenaltyDays).toBeGreaterThan(0);
  });

  test('[RULE-BOAT-021][boundary] boat cancellation outside 30 days has no short-term penalty', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'boat' });
    const token = authHeader(user._id);

    const startDate = dateOnlyOffset(40);
    const endDate = plusDaysFromDateOnly(startDate, 1);
    const created = await createBooking({ token, assetId: asset._id.toString(), startDate, endDate });
    expect(created.status).toBe(201);

    const bookingId = created.body.data.bookings[0]._id;
    const cancelled = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', token);

    expect(cancelled.status).toBe(200);
    expect(Boolean(cancelled.body.data.shortTermCancelled)).toBe(false);
  });

  test('[RULE-HOME-020][allow] allows >6 active bookings within 60 days for homes', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'home', sharePercentage: 12.5 });
    const token = authHeader(user._id);

    let lastStatus = null;

    for (let i = 0; i < 7; i += 1) {
      const startDate = dateOnlyOffset(10 + i * 3);
      const endDate = plusDaysFromDateOnly(startDate, 1);
      const res = await createBooking({ token, assetId: asset._id.toString(), startDate, endDate });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(201);
  });

  test('[RULE-HOME-019][allow] allocation excludes home bookings starting within 60 days', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'home', sharePercentage: 12.5 });
    const token = authHeader(user._id);

    const nearStart = dateOnlyOffset(45);
    const nearEnd = plusDaysFromDateOnly(nearStart, 1);
    const farStart = dateOnlyOffset(90);
    const farEnd = plusDaysFromDateOnly(farStart, 1);

    expect((await createBooking({ token, assetId: asset._id.toString(), startDate: nearStart, endDate: nearEnd })).status).toBe(201);
    expect((await createBooking({ token, assetId: asset._id.toString(), startDate: farStart, endDate: farEnd })).status).toBe(201);

    const allocation = await request(app)
      .get(`/api/bookings/allocation/${user._id.toString()}/${asset._id.toString()}`)
      .set('Authorization', token);

    expect(allocation.status).toBe(200);
    expect(allocation.body.data.activeBookingsUsed).toBe(1);
  });

  test('[RULE-BOAT-019][allow] allocation excludes boat bookings starting within 30 days', async () => {
    const user = await createUser();
    const asset = await createAssetForOwner({ ownerUserId: user._id, type: 'boat', sharePercentage: 12.5 });
    const token = authHeader(user._id);

    const nearStart = dateOnlyOffset(20);
    const nearEnd = nearStart;
    const farStart = dateOnlyOffset(45);
    const farEnd = farStart;

    expect((await createBooking({ token, assetId: asset._id.toString(), startDate: nearStart, endDate: nearEnd })).status).toBe(201);
    expect((await createBooking({ token, assetId: asset._id.toString(), startDate: farStart, endDate: farEnd })).status).toBe(201);

    const allocation = await request(app)
      .get(`/api/bookings/allocation/${user._id.toString()}/${asset._id.toString()}`)
      .set('Authorization', token);

    expect(allocation.status).toBe(200);
    expect(allocation.body.data.activeBookingsUsed).toBe(1);
  });
});
