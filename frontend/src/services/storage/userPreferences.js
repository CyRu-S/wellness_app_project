import { storage } from './asyncStorage';

const KEY = 'wellnest:user-preferences';
const defaults = { timelineReminders: true };

export const getUserPreferences = async () => {
  const stored = await storage.get(KEY);
  if (!stored) return defaults;
  try {
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return defaults;
  }
};

export const setUserPreferences = async (updates) => {
  const current = await getUserPreferences();
  const next = { ...current, ...updates };
  await storage.set(KEY, next);
  return next;
};
