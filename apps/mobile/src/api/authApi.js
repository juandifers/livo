import apiClient, { DEV_MODE } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { testUser } from '../utils/testData';
import { getToken, removeToken, setToken } from '../utils/tokenStorage';
import bookingApi from './bookingApi';
import assetApi from './assetApi';

const parseApiErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first?.msg === 'string' && first.msg.trim()) {
      return first.msg.trim();
    }
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    const message = data.error.trim();
    if (/User role 'user' is not authorized/i.test(message)) {
      return 'Account deletion endpoint is unavailable. Please update backend deployment.';
    }
    return message;
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }

  if (typeof data === 'string' && data.trim()) {
    const compact = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (/Cannot DELETE .*\/api\/auth\/me/i.test(compact)) {
      return 'Account deletion endpoint is unavailable. Please update backend deployment.';
    }
    if (/Cannot DELETE .*\/api\/users\/me/i.test(compact)) {
      return 'Account deletion endpoint is unavailable. Please update backend deployment.';
    }
    return compact;
  }

  if (!error?.response) {
    return 'Unable to reach server. Please check your connection and try again.';
  }

  return fallbackMessage;
};

const clearSessionCaches = async () => {
  try {
    await Promise.all([
      bookingApi.invalidateBookingDataCaches(),
      assetApi.invalidateUserAssetsCache()
    ]);
  } catch (_) {
    // Best effort cache cleanup.
  }
};

// Auth API endpoints
const login = async (email, password) => {
  try {
    // In development mode, use test data
    if (DEV_MODE) {
      // Allow login with any credentials in dev mode, or check for test user credentials
      if (email === 'test@example.com' && password === 'password') {
        // Create a fake token
        const token = 'fake-jwt-token-for-development';
        
        await clearSessionCaches();

        // Store token and user data
        await setToken(token);
        await AsyncStorage.setItem('user', JSON.stringify(testUser));
        
        return { success: true, data: { token, user: testUser } };
      } else {
        // In dev mode, you can either allow any login or enforce test credentials
        return { 
          success: false, 
          error: 'Invalid credentials. Use test@example.com / password for development.' 
        };
      }
    }
    
    // In production mode, use the real API
    const response = await apiClient.post('/auth/login', { email, password });
    const { token } = response.data;
    
    await clearSessionCaches();

    // Store the token first
    await setToken(token);
    
    // Now get the user data with the token
    try {
      const userResponse = await apiClient.get('/auth/me');
      const user = userResponse.data.data; // Backend returns { success: true, data: user }
      
      // Store user data
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, data: { token, user } };
    } catch (userError) {
      // If getting user fails, still return success with token but no user data
      console.warn('Could not fetch user data after login:', userError);
      return { success: true, data: { token, user: null } };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Login failed. Please check your connection and try again.' 
    };
  }
};

const logout = async () => {
  try {
    // In development mode, just clear storage
    if (DEV_MODE) {
      await clearSessionCaches();
      await removeToken();
      await AsyncStorage.removeItem('user');
      return { success: true };
    }
    
    // In production mode, call the API
    await apiClient.get('/auth/logout');
    await clearSessionCaches();
    await removeToken();
    await AsyncStorage.removeItem('user');
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Logout failed' 
    };
  }
};

const deleteMyAccount = async (currentPassword, confirmationText) => {
  try {
    // In development mode, simulate success and clear auth data
    if (DEV_MODE) {
      await clearSessionCaches();
      await removeToken();
      await AsyncStorage.removeItem('user');
      return { success: true };
    }

    const payload = { currentPassword, confirmationText };

    try {
      await apiClient.delete('/auth/me', { data: payload });
    } catch (primaryError) {
      const status = primaryError?.response?.status;
      const raw = primaryError?.response?.data;
      const rawText = typeof raw === 'string' ? raw : '';
      const authMeUnavailable =
        status === 404 ||
        status === 405 ||
        /Cannot DELETE .*\/api\/auth\/me/i.test(rawText);

      if (!authMeUnavailable) {
        return {
          success: false,
          error: parseApiErrorMessage(primaryError, 'Failed to delete account')
        };
      }

      // Backward compatibility for deployments where self-delete still lives at /users/me.
      await apiClient.delete('/users/me', { data: payload });
    }

    await clearSessionCaches();
    await removeToken();
    await AsyncStorage.removeItem('user');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: parseApiErrorMessage(error, 'Failed to delete account')
    };
  }
};

const completeAccountSetup = async (token, password, confirmPassword) => {
  try {
    // In development mode, simulate success
    if (DEV_MODE) {
      return { success: true, data: { message: 'Account setup completed successfully' } };
    }
    
    // In production mode
    const response = await apiClient.post(`/auth/account-setup/${token}`, { 
      password, 
      confirmPassword 
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.response?.data?.message || 'Account setup failed'
    };
  }
};

const forgotPassword = async (email) => {
  try {
    // In development mode, simulate success
    if (DEV_MODE) {
      return { success: true };
    }
    
    // In production mode
    await apiClient.post('/auth/forgot-password', { email });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.response?.data?.message || 'Password reset request failed'
    };
  }
};

const resetPassword = async (token, password, confirmPassword) => {
  try {
    // In development mode, simulate success
    if (DEV_MODE) {
      return { success: true };
    }
    
    // In production mode
    await apiClient.put(`/auth/reset-password/${token}`, { 
      password, 
      confirmPassword 
    });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.response?.data?.message || 'Password reset failed'
    };
  }
};

const changePassword = async (currentPassword, newPassword, confirmNewPassword) => {
  try {
    if (DEV_MODE) {
      return { success: true, data: { message: 'Password updated successfully' } };
    }

    await apiClient.put('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmNewPassword
    });
    return { success: true, data: { message: 'Password updated successfully' } };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to change password'
    };
  }
};

const getCurrentUser = async () => {
  try {
    // In development mode, return test user if token exists
    if (DEV_MODE) {
      const token = await getToken();
      if (token) {
        return { success: true, data: testUser };
      } else {
        return { success: false, error: 'Not authenticated' };
      }
    }
    
    // In production mode
    const response = await apiClient.get('/auth/me');
    return { success: true, data: response.data.data }; // Extract user from response.data.data
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to get current user' 
    };
  }
};

export default {
  login,
  logout,
  deleteMyAccount,
  completeAccountSetup,
  forgotPassword,
  resetPassword,
  changePassword,
  getCurrentUser
}; 
