/**
 * Application Configuration
 * 
 * This file contains configuration settings for the Livo App frontend.
 * Update these values based on your environment.
 */

// Backend API base URL
// You can override this at build/runtime using Expo env vars:
// - EXPO_PUBLIC_API_URL="https://your-backend.vercel.app/api"
// - EXPO_PUBLIC_API_BASE_URL="https://your-backend.vercel.app/api"
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://livo-backend-api.vercel.app/api';

// Development mode flag - set to false to use real backend API instead of mock data
export const DEV_MODE = false;

// Backend API URLs
export const API_CONFIG = {
  // For local development with physical device
  development: {
    baseURL: 'http://10.22.39.64:3000/api',
    timeout: 10000
  },
  
  // For staging/testing environment
  staging: {
    baseURL: 'https://staging-api.yourdomain.com/api',
    timeout: 15000
  },
  
  // For production environment
  production: {
    baseURL:
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      'https://livo-backend-api.vercel.app/api',
    timeout: 15000
  }
};

// Current environment - can be 'development', 'staging', or 'production'
// Use 'development' for local backend, 'production' for deployed backend
export const ENVIRONMENT = 'production';

// Get the current API configuration based on environment
export const getCurrentApiConfig = () => {
  if (DEV_MODE) {
    return API_CONFIG.development;
  }
  
  return API_CONFIG[ENVIRONMENT] || API_CONFIG.production;
};

// Default test credentials for development mode - updated to match demo data
export const TEST_CREDENTIALS = {
  email: 'sarah.johnson@example.com',
  password: 'demo123'
}; 