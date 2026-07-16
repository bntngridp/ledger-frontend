import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (err) {
        console.error('Error setting item in localStorage:', err);
      }
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Error setting item in SecureStore:', err);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (err) {
        console.error('Error getting item from localStorage:', err);
      }
      return null;
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('Error getting item from SecureStore:', err);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (err) {
        console.error('Error removing item from localStorage:', err);
      }
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.error('Error deleting item from SecureStore:', err);
    }
  },
};
