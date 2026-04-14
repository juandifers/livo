import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line import/no-unresolved
import * as SecureStore from 'expo-secure-store';

const TOKEN_STORAGE_KEY = 'token';

const canUseSecureStore = async () => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (_error) {
    return false;
  }
};

const getSecureToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  } catch (_error) {
    return null;
  }
};

const setSecureToken = async (token) => {
  try {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
    });
    return true;
  } catch (_error) {
    return false;
  }
};

const removeSecureToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
  } catch (_error) {
    // Ignore cleanup failures so logout still succeeds.
  }
};

export const setToken = async (token) => {
  if (!token) {
    await removeToken();
    return;
  }

  if (await canUseSecureStore()) {
    const saved = await setSecureToken(token);
    if (saved) {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      return;
    }
  }

  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const getToken = async () => {
  const secureStoreAvailable = await canUseSecureStore();
  if (secureStoreAvailable) {
    const secureToken = await getSecureToken();
    if (secureToken) {
      return secureToken;
    }
  }

  // Migration fallback: move older AsyncStorage token into SecureStore.
  const legacyToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (!legacyToken) {
    return null;
  }

  if (secureStoreAvailable) {
    await setSecureToken(legacyToken);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  return legacyToken;
};

export const removeToken = async () => {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  await removeSecureToken();
};
