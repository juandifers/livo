import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api';

// Create the context
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  // Check if user is logged in on app startup
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        setIsLoading(true);
        
        // Get token from storage
        const storedToken = await AsyncStorage.getItem('token');
        
        if (storedToken) {
          // Set token
          setToken(storedToken);
          
          // Get user data
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            // If no stored user but token exists, fetch from API
            const result = await authApi.getCurrentUser();
            if (result.success) {
              setUser(result.data);
            } else {
              // If failed to get user, clear token
              await AsyncStorage.removeItem('token');
              setToken(null);
            }
          }
        }
      } catch (e) {
        console.error('Error bootstrapping auth state:', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    bootstrapAsync();
  }, []);
  
  // Login function
  const login = async (email, password) => {
    try {
      setIsSigningIn(true);
      
      const result = await authApi.login(email, password);
      
      if (result.success) {
        setToken(result.data.token);
        setUser(result.data.user);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsSigningIn(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      await authApi.logout();
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  const value = {
    user,
    token,
    isLoading,
    isSigningIn,
    login,
    logout,
    isAuthenticated: !!token,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 