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

export default {
  getUserBookings,
  getAssetBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking
}; 