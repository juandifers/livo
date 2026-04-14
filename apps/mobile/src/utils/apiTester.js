/**
 * API Tester Utility
 * 
 * This file contains functions to test API communication between frontend and backend.
 * Run these functions from your app to verify connectivity.
 */

import { authApi, assetApi, bookingApi } from '../api';
import { DEV_MODE, getCurrentApiConfig } from '../config';

// Display current configuration
const logApiConfig = () => {
  const config = getCurrentApiConfig();
  console.log('=== API CONFIGURATION ===');
  console.log(`DEV_MODE: ${DEV_MODE}`);
  console.log(`API URL: ${config.baseURL}`);
  console.log(`Timeout: ${config.timeout}ms`);
  console.log('========================');
};

// Test authentication
const testAuthentication = async (email, password) => {
  console.log('Testing authentication...');
  try {
    const result = await authApi.login(email, password);
    console.log('Login result:', result);
    return result;
  } catch (error) {
    console.error('Authentication test failed:', error);
    return { success: false, error: error.message };
  }
};

// Test getting assets
const testGetAssets = async () => {
  console.log('Testing get assets...');
  try {
    const result = await assetApi.getAllAssets();
    console.log(`Fetched ${result.data?.length || 0} assets`);
    return result;
  } catch (error) {
    console.error('Get assets test failed:', error);
    return { success: false, error: error.message };
  }
};

// Test getting user bookings
const testGetUserBookings = async () => {
  console.log('Testing get user bookings...');
  try {
    const result = await bookingApi.getUserBookings();
    console.log(`Fetched ${result.data?.length || 0} bookings`);
    return result;
  } catch (error) {
    console.error('Get bookings test failed:', error);
    return { success: false, error: error.message };
  }
};

// Run all tests
const runAllTests = async (email, password) => {
  logApiConfig();
  
  // Test authentication first
  const authResult = await testAuthentication(email, password);
  if (!authResult.success) {
    console.error('Authentication failed. Stopping tests.');
    return;
  }
  
  // Test other endpoints
  await testGetAssets();
  await testGetUserBookings();
  
  console.log('All tests completed!');
};

export {
  logApiConfig,
  testAuthentication,
  testGetAssets,
  testGetUserBookings,
  runAllTests
}; 