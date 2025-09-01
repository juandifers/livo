import apiClient, { DEV_MODE } from './apiClient';
import { testBookings } from '../utils/testData';

// Booking API endpoints
const getUserBookings = async () => {
  try {
    // In development mode, use test data
    if (DEV_MODE) {
      return { success: true, data: testBookings };
    }
    
    // In production mode - first get current user ID, then fetch bookings for that user
    try {
      const userResponse = await apiClient.get('/auth/me');
      const userId = userResponse.data.data._id;
      
      const response = await apiClient.get(`/bookings?user=${userId}`);
      return { success: true, data: response.data.data }; // Extract bookings from response.data.data
    } catch (userError) {
      // If we can't get user ID, try the old endpoint as fallback
      const response = await apiClient.get('/bookings');
      return { success: true, data: response.data.data };
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
      return { 
        success: true, 
        data: {
          sharePercentage: 50, // Sarah has 50% ownership of Serenity Dreams
          allowedDaysPerYear: 176, // 50% ownership = 176 days (4 * 44)
          daysBooked: 7,
          daysRemaining: 169,
          extraAllowedDays: 40, // 50% ownership = 40 extra days (4 * 10)
          extraDaysUsed: 0,
          extraDaysRemaining: 40,
          activeBookings: 1,
          maxActiveBookings: 24, // 50% ownership = 24 bookings (4 * 6)
          activeBookingsRemaining: 23,
          maxStayLength: 56, // 50% ownership = 56 days (4 * 14)
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
    // In development mode, simulate booking creation
    if (DEV_MODE) {
      const newBooking = {
        _id: 'test-booking-' + Date.now(),
        ...bookingData,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      return { success: true, data: newBooking };
    }
    
    // In production mode
    const response = await apiClient.post('/bookings', bookingData);
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
  getAssetAvailability
}; 