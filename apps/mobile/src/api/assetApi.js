import apiClient, { DEV_MODE } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { testAssets } from '../utils/testData';
import { invalidateCachePrefix, readCachedValue, writeCachedValue } from '../utils/dataCache';

const USER_ASSETS_CACHE_PREFIX = 'assets:user:';
const USER_ASSETS_MEMORY_TTL_MS = 30 * 1000;
const USER_ASSETS_DISK_TTL_MS = 15 * 60 * 1000;
const STALE_FALLBACK_TTL_MS = 24 * 60 * 60 * 1000;

const getUserAssetsCacheKey = (userId) => `${USER_ASSETS_CACHE_PREFIX}${userId || 'self'}`;

const maybeReadUserAssetsCache = async (cacheKey, { allowStale = false } = {}) => (
  readCachedValue(cacheKey, {
    memoryTtlMs: USER_ASSETS_MEMORY_TTL_MS,
    diskTtlMs: USER_ASSETS_DISK_TTL_MS,
    allowStale
  })
);

const getCurrentUserId = async () => {
  try {
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      const userId = parsed?._id || parsed?.id;
      if (userId) return userId;
    }
  } catch (_) {
    // Best effort only.
  }

  try {
    const response = await apiClient.get('/auth/me');
    const currentUser = response.data?.data;
    const userId = currentUser?._id || currentUser?.id || null;

    if (userId && currentUser) {
      await AsyncStorage.setItem('user', JSON.stringify(currentUser));
    }

    return userId;
  } catch (_) {
    return null;
  }
};

// Asset API endpoints
const getAllAssets = async () => {
  try {
    // In development mode, use test data
    if (DEV_MODE) {
      return { success: true, data: testAssets };
    }
    
    // In production mode
    const response = await apiClient.get('/assets');
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Error fetching assets:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch assets' 
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
    return { success: true, data: response.data.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch asset details' 
    };
  }
};

const getUserAssets = async ({ forceRefresh = false } = {}) => {
  try {
    // In development mode, filter test data for user's assets
    if (DEV_MODE) {
      // Filter assets where test user is an owner
      const userAssets = testAssets.filter(asset => 
        asset.owners.some(owner => owner.user === '1234567890')
      );
      return { success: true, data: userAssets };
    }

    const userId = await getCurrentUserId();
    const cacheKey = getUserAssetsCacheKey(userId);

    if (!forceRefresh) {
      const cached = await maybeReadUserAssetsCache(cacheKey);
      if (cached.hit) {
        return { success: true, data: Array.isArray(cached.value) ? cached.value : [], cached: true, stale: cached.stale };
      }
    }
    
    // In production mode
    const response = await apiClient.get('/users/me/assets');
    const assets = Array.isArray(response.data?.data) ? response.data.data : [];
    await writeCachedValue(cacheKey, assets);
    return { success: true, data: assets };
  } catch (error) {
    const userId = await getCurrentUserId();
    const cacheKey = getUserAssetsCacheKey(userId);

    const cachedFallback = await readCachedValue(cacheKey, {
      memoryTtlMs: STALE_FALLBACK_TTL_MS,
      diskTtlMs: STALE_FALLBACK_TTL_MS,
      allowStale: true
    });

    if (cachedFallback.hit) {
      return { success: true, data: Array.isArray(cachedFallback.value) ? cachedFallback.value : [], cached: true, stale: true };
    }

    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch user assets' 
    };
  }
};

const invalidateUserAssetsCache = async () => {
  await invalidateCachePrefix(USER_ASSETS_CACHE_PREFIX);
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
    return { success: true, data: response.data.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch assets by type' 
    };
  }
};

export default {
  getAllAssets,
  getAssetById,
  getUserAssets,
  getAssetsByType,
  invalidateUserAssetsCache
}; 
