/**
 * Application Configuration
 * 
 * This file contains configuration settings for the Livo App frontend.
 * Update these values based on your environment.
 */

const parseBooleanEnv = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const extractHostFromExpoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return null;
  const withoutProtocol = uri.replace(/^\w+:\/\//, '');
  const hostPort = withoutProtocol.split('/')[0];
  const host = hostPort.split(':')[0];
  return host || null;
};

const detectExpoDevHost = () => {
  try {
    // Loaded dynamically so non-Expo contexts don't break.
    const ExpoConstants = require('expo-constants').default;
    const candidates = [
      ExpoConstants?.expoConfig?.hostUri,
      ExpoConstants?.manifest2?.extra?.expoClient?.hostUri,
      ExpoConstants?.manifest?.debuggerHost,
      ExpoConstants?.manifest?.hostUri,
    ];

    for (const candidate of candidates) {
      const host = extractHostFromExpoUri(candidate);
      if (host) return host;
    }
  } catch (_error) {
    // Ignore detection errors and fallback to localhost.
  }

  return null;
};

const resolveDevelopmentApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_LOCAL_API_URL) {
    return process.env.EXPO_PUBLIC_LOCAL_API_URL;
  }

  const expoHost = detectExpoDevHost();
  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return `http://${expoHost}:3000/api`;
  }

  return 'http://localhost:3000/api';
};

const PRODUCTION_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://livo-backend-api.vercel.app/api';

const DEVELOPMENT_API_BASE_URL = resolveDevelopmentApiBaseUrl();

// Development mode flag - set to false to use real backend API instead of mock data
export const DEV_MODE = false;
export const SHOW_API_TEST_TOOLS =
  DEV_MODE || parseBooleanEnv(process.env.EXPO_PUBLIC_ENABLE_API_TEST_TOOLS, false);

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
// Defaults to development during local `expo start`; production otherwise.
const environmentOverride = process.env.EXPO_PUBLIC_ENVIRONMENT;
const defaultEnvironment = process.env.NODE_ENV === 'development' ? 'development' : 'production';
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
