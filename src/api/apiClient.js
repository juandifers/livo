import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEV_MODE, getCurrentApiConfig } from '../config';

// Get API configuration based on environment
const apiConfig = getCurrentApiConfig();

// Create an axios instance
const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: apiConfig.timeout,
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
export { DEV_MODE }; 