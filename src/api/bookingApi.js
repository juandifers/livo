import apiClient, { DEV_MODE } from './apiClient';
import { testBookings } from '../utils/testData';
import DateUtils from '../utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

let hasLoggedFreedAlertFallback = false;

// Booking API endpoints
const getUserBookings = async () => {
  try {
    // In development mode, use test data
    if (DEV_MODE) {
      return { success: true, data: testBookings };
    }
    
    // In production mode - first get current user ID, then fetch bookings for that user
    try {
      let userId = null;

      // Prefer locally cached user ID to avoid an extra network roundtrip.
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          userId = parsedUser?._id || parsedUser?.id || null;
        } catch (_) {
          userId = null;
        }
      }

      if (!userId) {
        const userResponse = await apiClient.get('/auth/me');
        const user = userResponse.data?.data;
        userId = user?._id || null;
        if (userId && user) {
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }
      }

      const endpoint = userId ? `/bookings?user=${userId}` : '/bookings';
      const response = await apiClient.get(endpoint);
      const bookings = response.data.data.map(booking => DateUtils.parseBookingDates(booking));
      return { success: true, data: bookings };
    } catch (_userError) {
      // If we can't get user ID, try the old endpoint as fallback
      const response = await apiClient.get('/bookings');
      const bookings = response.data.data.map(booking => DateUtils.parseBookingDates(booking));
      return { success: true, data: bookings };
    }
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch user bookings' 
    };
  }
};

const getUserAllocation = async (userId, assetId) => {
  try {
    // In development mode, simulate allocation data
    if (DEV_MODE) {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const startStr = `${yyyy}-${mm}-${dd}`;
      const endStr = `${yyyy + 1}-${mm}-${dd}`;
      
      return { 
        success: true, 
        data: {
          sharePercentage: 50, // Sarah has 50% ownership of Serenity Dreams
          allowedDaysPerYear: 176, // 50% ownership = 176 days (4 * 44)
          extraAllowedDays: 40, // 50% ownership = 40 extra days (4 * 10)
          maxActiveBookings: 24, // 50% ownership = 24 bookings (4 * 6)
          maxStayLength: 56, // 50% ownership = 56 days (4 * 14)
          
          // FEAT-ACTIVE-001: Universal active bookings counter
          activeBookingsUsed: 1,
          activeBookingsRemaining: 23,
          
          // Current year allocation
          currentYear: {
            year: currentYear,
            windowStart: startStr,
            windowEnd: endStr,
            daysBooked: 7,
            daysRemaining: 169,
            extraDaysUsed: 0,
            extraDaysRemaining: 40,
            specialDateUsage: { type1: 0, type2: 0 },
            bookings: []
          },
          
          // Next year allocation
          nextYear: {
            year: nextYear,
            windowStart: endStr,
            windowEnd: `${yyyy + 2}-${mm}-${dd}`,
            daysBooked: 0,
            daysRemaining: 176,
            extraDaysUsed: 0,
            extraDaysRemaining: 40,
            specialDateUsage: { type1: 0, type2: 0 },
            bookings: []
          },

          // New window fields (backend now returns these)
          currentWindow: { start: startStr, end: endStr },
          nextWindow: { start: endStr, end: `${yyyy + 2}-${mm}-${dd}` },
          
          // Legacy fields for backward compatibility
          daysBooked: 7,
          daysRemaining: 169,
          extraDaysUsed: 0,
          extraDaysRemaining: 40,
          activeBookings: 1,
          currentBookings: [],
          futureBookings: []
        }
      };
    }
    
    // In production mode
    const response = await apiClient.get(`/bookings/allocation/${userId}/${assetId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch user allocation' 
    };
  }
};

const getAssetBookings = async (assetId) => {
  try {
    // In development mode, filter test bookings for the asset
    if (DEV_MODE) {
      const assetBookings = testBookings.filter(booking => booking.asset._id === assetId);
      return { success: true, data: assetBookings };
    }
    
    // In production mode
    const response = await apiClient.get(`/bookings/asset/${assetId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch asset bookings' 
    };
  }
};

const getBookingById = async (bookingId) => {
  try {
    // In development mode, find booking in test data
    if (DEV_MODE) {
      const booking = testBookings.find(booking => booking._id === bookingId);
      if (booking) {
        return { success: true, data: booking };
      } else {
        return { success: false, error: 'Booking not found' };
      }
    }
    
    // In production mode
    const response = await apiClient.get(`/bookings/${bookingId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch booking details' 
    };
  }
};

const createBooking = async (bookingData) => {
  try {
    // Prepare booking data using DateUtils
    const preparedData = DateUtils.prepareBookingForApi(bookingData);
    
    // In development mode, simulate booking creation
    if (DEV_MODE) {
      const newBooking = {
        _id: 'test-booking-' + Date.now(),
        ...preparedData,
        status: 'pending',
        createdAt: DateUtils.toApiFormat(new Date())
      };
      return { success: true, data: newBooking };
    }
    
    // In production mode
    const response = await apiClient.post('/bookings', preparedData);
    return { success: true, data: response.data.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to create booking' 
    };
  }
};

const updateBooking = async (bookingId, updateData) => {
  try {
    // In development mode, simulate update
    if (DEV_MODE) {
      return { success: true, data: { ...updateData, _id: bookingId } };
    }
    
    // In production mode
    const response = await apiClient.put(`/bookings/${bookingId}`, updateData);
    return { success: true, data: response.data.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to update booking' 
    };
  }
};

const cancelBooking = async (bookingId) => {
  try {
    // In development mode, simulate cancellation
    if (DEV_MODE) {
      return { success: true, data: { message: 'Booking cancelled successfully' } };
    }
    
    // In production mode
    const response = await apiClient.delete(`/bookings/${bookingId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to cancel booking' 
    };
  }
};

const toDateAtMidnight = (input) => {
  if (!input) return null;

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }

  if (typeof input === 'string') {
    const normalized = input.includes('T') ? input.split('T')[0] : input;
    const parsed = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const toDateOnlyString = (input) => {
  const parsed = toDateAtMidnight(input);
  return parsed ? DateUtils.toApiFormat(parsed) : null;
};

const rangesOverlap = (leftStart, leftEnd, rightStart, rightEnd) => (
  leftStart <= rightEnd && leftEnd >= rightStart
);

const getCurrentUserId = async () => {
  try {
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      const cachedId = parsed?._id || parsed?.id;
      if (cachedId) return cachedId;
    }
  } catch (_) {
    // Best effort only.
  }

  try {
    const response = await apiClient.get('/auth/me');
    const currentUser = response.data?.data;
    const userId = currentUser?._id || currentUser?.id || null;

    if (userId && currentUser) {
      await AsyncStorage.setItem('user', JSON.stringify(currentUser));
    }

    return userId;
  } catch (_) {
    return null;
  }
};

const getFreedDateAlertsFallback = async (limit = 20) => {
  const requesterId = await getCurrentUserId();
  if (!requesterId) {
    throw new Error('Unable to resolve current user');
  }

  const [assetsResponse, bookingsResponse] = await Promise.all([
    apiClient.get('/users/me/assets'),
    apiClient.get('/bookings')
  ]);

  const ownedAssets = Array.isArray(assetsResponse.data?.data) ? assetsResponse.data.data : [];
  if (!ownedAssets.length) return [];

  const ownedAssetMap = new Map(
    ownedAssets
      .filter((asset) => asset?._id)
      .map((asset) => [String(asset._id), asset])
  );

  const ownedAssetIds = new Set(ownedAssetMap.keys());
  const allBookings = Array.isArray(bookingsResponse.data?.data) ? bookingsResponse.data.data : [];

  const now = new Date();
  const cutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const candidates = allBookings
    .filter((booking) => {
      if (!booking || booking.status !== 'cancelled') return false;

      const assetId = String(booking?.asset?._id || booking?.asset || '');
      if (!ownedAssetIds.has(assetId)) return false;

      const bookedUserId = String(booking?.user?._id || booking?.user || '');
      if (bookedUserId && bookedUserId === String(requesterId)) return false;

      const cancelledAt = toDateAtMidnight(booking.cancelledAt);
      if (!cancelledAt || cancelledAt < cutoff) return false;

      const endDate = toDateAtMidnight(booking.endDate);
      if (!endDate || endDate < today) return false;

      return true;
    })
    .sort((a, b) => {
      const aCancelled = toDateAtMidnight(a?.cancelledAt)?.getTime() || 0;
      const bCancelled = toDateAtMidnight(b?.cancelledAt)?.getTime() || 0;
      return bCancelled - aCancelled;
    });

  const safeLimit = Number.isFinite(Number(limit))
    ? Math.min(Math.max(Number(limit), 1), 100)
    : 20;

  const alerts = [];

  for (const cancelledBooking of candidates) {
    const assetId = String(cancelledBooking?.asset?._id || cancelledBooking?.asset || '');
    const cancelledStart = toDateAtMidnight(cancelledBooking.startDate);
    const cancelledEnd = toDateAtMidnight(cancelledBooking.endDate);
    if (!assetId || !cancelledStart || !cancelledEnd) continue;

    const hasOverlap = allBookings.some((activeBooking) => {
      if (!activeBooking) return false;
      if (String(activeBooking._id) === String(cancelledBooking._id)) return false;
      if (activeBooking.status === 'cancelled') return false;

      const activeAssetId = String(activeBooking?.asset?._id || activeBooking?.asset || '');
      if (activeAssetId !== assetId) return false;

      const activeStart = toDateAtMidnight(activeBooking.startDate);
      const activeEnd = toDateAtMidnight(activeBooking.endDate);
      if (!activeStart || !activeEnd) return false;

      return rangesOverlap(activeStart, activeEnd, cancelledStart, cancelledEnd);
    });

    if (hasOverlap) continue;

    const asset = ownedAssetMap.get(assetId) || cancelledBooking.asset || {};
    const cancelledBy = cancelledBooking.user || {};

    alerts.push({
      alertId: `booking_${cancelledBooking._id}`,
      bookingId: cancelledBooking._id,
      asset: {
        _id: asset._id || assetId,
        name: asset.name || '',
        type: asset.type || '',
        location: asset.location || ''
      },
      cancelledBy: {
        _id: cancelledBy._id || null,
        name: cancelledBy.name || '',
        lastName: cancelledBy.lastName || ''
      },
      startDate: toDateOnlyString(cancelledBooking.startDate),
      endDate: toDateOnlyString(cancelledBooking.endDate),
      cancelledAt: toDateAtMidnight(cancelledBooking.cancelledAt)?.toISOString() || null
    });

    if (alerts.length >= safeLimit) break;
  }

  return alerts;
};

const getFreedDateAlerts = async (limit = 20) => {
  const safeLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;

  try {
    if (DEV_MODE) {
      return { success: true, data: [] };
    }

    const response = await apiClient.get(`/bookings/alerts/freed-dates?limit=${encodeURIComponent(safeLimit)}`);
    return { success: true, data: response.data?.data || [] };
  } catch (error) {
    const status = error.response?.status;
    const backendError = error.response?.data?.error;
    const requestUrl = error.config?.url || '/bookings/alerts/freed-dates';

    if (status === 404) {
      try {
        const fallbackAlerts = await getFreedDateAlertsFallback(safeLimit);
        if (!hasLoggedFreedAlertFallback) {
          hasLoggedFreedAlertFallback = true;
          console.warn('Freed-date alerts endpoint not found; using client-side fallback.');
        }
        return { success: true, data: fallbackAlerts };
      } catch (fallbackError) {
        console.error('Freed-date alerts fallback failed:', fallbackError?.message || fallbackError);
        return {
          success: false,
          error: 'Alerts endpoint is not available and fallback query failed.'
        };
      }
    }

    if (status === 401) {
      return {
        success: false,
        error: 'Your session expired. Please sign in again.'
      };
    }

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Alerts request timed out. Please try again.'
      };
    }

    console.error('Error fetching freed-date alerts:', {
      status,
      code: error.code,
      url: requestUrl,
      message: backendError || error.message
    });

    return {
      success: false,
      error: backendError || `Failed to fetch freed-date alerts${status ? ` (HTTP ${status})` : ''}`
    };
  }
};

const getAssetAvailability = async (assetId, startDate, endDate) => {
  try {
    // In development mode, return mock availability data
    if (DEV_MODE) {
      return {
        success: true,
        data: {
          unavailableDates: [
            '2025-08-20',
            '2025-08-21',
            '2025-08-22',
          ],
          specialDates: {
            type1: [
              '2025-08-07',
              '2025-08-08',
              '2025-08-09',
              '2025-08-10',
              '2025-08-15',
              '2025-08-16',
              '2025-08-17',
              '2025-08-18',
            ],
            type2: []
          },
          bookings: []
        }
      };
    }
    
    // In production mode - construct query parameters
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/bookings/availability/${assetId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    
    // The backend now returns both calendar data and special dates
    const { calendar, specialDates } = response.data.data;
    
    const unavailableDates = [];
    const bookings = [];
    
    // Extract unavailable dates and bookings from calendar
    if (calendar) {
      Object.keys(calendar).forEach(dateStr => {
        const dayInfo = calendar[dateStr];
        if (!dayInfo.available) {
          unavailableDates.push(dateStr);
          if (dayInfo.bookings && dayInfo.bookings.length > 0) {
            dayInfo.bookings.forEach(booking => {
              bookings.push({
                date: dateStr,
                bookingId: booking.bookingId,
                userId: booking.userId
              });
            });
          }
        }
      });
    }
    
    return { 
      success: true, 
      data: {
        unavailableDates,
        specialDates: specialDates || {
          type1: [],
          type2: []
        },
        bookings,
        calendar
      }
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch asset availability' 
    };
  }
};

export default {
  getUserBookings,
  getUserAllocation,
  getAssetBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  getFreedDateAlerts,
  getAssetAvailability
}; 
