/**
 * Application Configuration
 * 
 * This file contains configuration settings for the Livo App frontend.
 * Update these values based on your environment.
 */

// Backend API base URL
export const API_BASE_URL = 'http://localhost:3000/api';

// Development mode flag - set to false when deploying to production
export const DEV_MODE = false;

// Backend API URLs
export const API_CONFIG = {
  // For local development with physical device
  development: {
    baseURL: 'http://192.168.0.12:3000/api',
    timeout: 10000
  },
  
  // For staging/testing environment
  staging: {
    baseURL: 'https://staging-api.yourdomain.com/api',
    timeout: 15000
  },
  
  // For production environment
  production: {
    baseURL: 'https://api.yourdomain.com/api',
    timeout: 15000
  }
};

// Current environment - can be 'development', 'staging', or 'production'
export const ENVIRONMENT = 'development';

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