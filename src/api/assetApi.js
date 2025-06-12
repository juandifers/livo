import apiClient from './apiClient';
import { testAssets } from '../utils/testData';

// Check if we're in development mode (should match authApi)
const DEV_MODE = true;

// Asset API endpoints
const getAllAssets = async () => {
  try {
    // In development mode, use test data
    if (DEV_MODE) {
      return { success: true, data: testAssets };
    }
    
    // In production mode
    const response = await apiClient.get('/assets');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch assets' 
    };
  }
};

const getAssetById = async (assetId) => {
  try {
    // In development mode, find asset in test data
    if (DEV_MODE) {
      const asset = testAssets.find(asset => asset._id === assetId);
      if (asset) {
        return { success: true, data: asset };
      } else {
        return { success: false, error: 'Asset not found' };
      }
    }
    
    // In production mode
    const response = await apiClient.get(`/assets/${assetId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch asset details' 
    };
  }
};

const getUserAssets = async () => {
  try {
    // In development mode, filter test data for user's assets
    if (DEV_MODE) {
      // Filter assets where test user is an owner
      const userAssets = testAssets.filter(asset => 
        asset.owners.some(owner => owner.user === '1234567890')
      );
      return { success: true, data: userAssets };
    }
    
    // In production mode
    const response = await apiClient.get('/assets/me');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch user assets' 
    };
  }
};

const getAssetsByType = async (type) => {
  try {
    // In development mode, filter test data by type
    if (DEV_MODE) {
      const filteredAssets = testAssets.filter(asset => asset.type === type);
      return { success: true, data: filteredAssets };
    }
    
    // In production mode
    const response = await apiClient.get(`/assets/type/${type}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch assets by type' 
    };
  }
};

export default {
  getAllAssets,
  getAssetById,
  getUserAssets,
  getAssetsByType
}; 