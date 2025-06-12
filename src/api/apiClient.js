import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if we're in development mode
const DEV_MODE = true;

// Base URL for the backend API - Use your local IP address instead of localhost for mobile devices
// Only relevant in production mode
const API_URL = 'http://192.168.1.46:3000/api'; // Update this with your actual IP address

// Create an axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh or logout on auth errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Handle token expiration - could implement token refresh here
      // For now, just logout
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Navigate to login screen would happen via auth context
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 