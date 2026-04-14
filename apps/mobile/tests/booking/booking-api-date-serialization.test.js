const mockPost = jest.fn();

jest.mock('../../src/api/apiClient', () => ({
    __esModule: true,
    DEV_MODE: false,
    default: {
      get: jest.fn(),
      post: (...args) => mockPost(...args),
      put: jest.fn(),
      delete: jest.fn()
    }
}));

import bookingApi from '../../src/api/bookingApi';

describe('Mobile booking API date serialization', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  test('createBooking sends YYYY-MM-DD date-only payload', async () => {
    mockPost.mockResolvedValue({ data: { data: { _id: 'b1' } } });

    const startDate = new Date('2026-03-08T15:45:00.000Z');
    const endDate = new Date('2026-03-10T04:00:00.000Z');

    await bookingApi.createBooking({
      assetId: 'asset-1',
      startDate,
      endDate
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    const payload = mockPost.mock.calls[0][1];
    expect(payload.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
