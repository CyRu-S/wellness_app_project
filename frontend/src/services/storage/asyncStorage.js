import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryFallback = new Map();

export const storage = {
  get: async (key) => {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored != null) memoryFallback.set(key, stored);
      return stored ?? memoryFallback.get(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },
  set: async (key, value) => {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    memoryFallback.set(key, serialized);
    try {
      await AsyncStorage.setItem(key, serialized);
    } catch {
      // Keep the session usable when device storage is temporarily unavailable.
    }
  },
  remove: async (key) => {
    memoryFallback.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // The fallback is already cleared, so a failed native removal is non-blocking.
    }
  },
};

