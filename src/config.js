/**
 * Application Configuration
 * 
 * This file contains configuration settings for the Livo App frontend.
 * Update these values based on your environment.
 */

const PRODUCTION_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://livo-backend-api.vercel.app/api';

const DEVELOPMENT_API_BASE_URL =
  process.env.EXPO_PUBLIC_LOCAL_API_URL ||
  'http://10.22.39.64:3000/api';

// Development mode flag - set to false to use real backend API instead of mock data
export const DEV_MODE = false;

// Backend API URLs
export const API_CONFIG = {
  // For local development with physical device
  development: {
    baseURL: DEVELOPMENT_API_BASE_URL,
    timeout: 10000
  },
  
  // For staging/testing environment
  staging: {
    baseURL: 'https://staging-api.yourdomain.com/api',
    timeout: 15000
  },
  
  // For production environment
  production: {
    baseURL: PRODUCTION_API_BASE_URL,
    timeout: 15000
  }
};

// Current environment - can be 'development', 'staging', or 'production'
// Defaults to production unless explicitly overridden.
const environmentOverride = process.env.EXPO_PUBLIC_ENVIRONMENT;
const defaultEnvironment = 'production';
const requestedEnvironment = environmentOverride || defaultEnvironment;
const validEnvironments = ['development', 'staging', 'production'];
export const ENVIRONMENT = validEnvironments.includes(requestedEnvironment)
  ? requestedEnvironment
  : defaultEnvironment;

// Backend API base URL for current environment
export const API_BASE_URL =
  API_CONFIG[ENVIRONMENT]?.baseURL ||
  PRODUCTION_API_BASE_URL;

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
