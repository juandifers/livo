import apiClient from './apiClient';
import { testBookings } from '../utils/testData';

// Check if we're in development mode (should match authApi)
const DEV_MODE = true;

// Booking API endpoints
const getUserBookings = async () => {
  try {
    // In development mode, use test data
    if (DEV_MODE) {
      return { success: true, data: testBookings };
    }
    
    // In production mode
    const response = await apiClient.get('/bookings/me');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch user bookings' 
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
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch asset bookings' 
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
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch booking details' 
    };
  }
};

const createBooking = async (bookingData) => {
  try {
    // In development mode, simulate creating a booking
    if (DEV_MODE) {
      // Generate a fake booking with a new ID
      const newBooking = {
        _id: 'booking' + Date.now(),
        user: '1234567890',
        asset: bookingData.asset,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        status: 'pending',
        notes: bookingData.notes || '',
        createdAt: new Date().toISOString()
      };
      
      // Add to test bookings (this won't persist after app reload)
      testBookings.push(newBooking);
      
      return { success: true, data: newBooking };
    }
    
    // In production mode
    const response = await apiClient.post('/bookings', bookingData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to create booking' 
    };
  }
};

const updateBooking = async (bookingId, bookingData) => {
  try {
    // In development mode, simulate updating a booking
    if (DEV_MODE) {
      const bookingIndex = testBookings.findIndex(booking => booking._id === bookingId);
      
      if (bookingIndex !== -1) {
        // Update the booking in the test data
        testBookings[bookingIndex] = {
          ...testBookings[bookingIndex],
          ...bookingData,
          updatedAt: new Date().toISOString()
        };
        
        return { success: true, data: testBookings[bookingIndex] };
      } else {
        return { success: false, error: 'Booking not found' };
      }
    }
    
    // In production mode
    const response = await apiClient.put(`/bookings/${bookingId}`, bookingData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to update booking' 
    };
  }
};

const cancelBooking = async (bookingId) => {
  try {
    // In development mode, simulate cancelling a booking
    if (DEV_MODE) {
      const bookingIndex = testBookings.findIndex(booking => booking._id === bookingId);
      
      if (bookingIndex !== -1) {
        // Update the booking status to cancelled
        testBookings[bookingIndex].status = 'cancelled';
        testBookings[bookingIndex].updatedAt = new Date().toISOString();
        
        return { success: true, data: testBookings[bookingIndex] };
      } else {
        return { success: false, error: 'Booking not found' };
      }
    }
    
    // In production mode
    const response = await apiClient.put(`/bookings/${bookingId}/cancel`);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to cancel booking' 
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