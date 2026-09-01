import { API_URL } from '../services/api/client';

export const numeric = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatJournalDate = (value, options = { weekday: 'long', day: 'numeric', month: 'long' }) => {
  if (!value) return new Date().toLocaleDateString('en-IN', options);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('en-IN', options);
};

export const formatJournalClock = (value) => {
  if (!value) return null;
  if (/^\d{1,2}:\d{2}/.test(value)) {
    const [hour, minute] = value.split(':').map(Number);
    const stamp = new Date();
    stamp.setHours(hour, minute, 0, 0);
    return stamp.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

export const mealImageUri = (meal) => meal?.imageUrl || meal?.imageUri || (meal?.postId ? `/api/meal-posts/${meal.postId}/image` : null);

export const protectedImageSource = (meal, token) => {
  const rawUri = mealImageUri(meal);
  if (!rawUri) return null;
  if (typeof rawUri !== 'string') return rawUri;
  let uri = rawUri;
  if (!/^(https?:|file:|data:|blob:)/i.test(rawUri)) {
    const origin = API_URL.replace(/\/api\/?$/, '');
    uri = rawUri.startsWith('/api/') ? `${origin}${rawUri}` : `${API_URL.replace(/\/$/, '')}/${rawUri.replace(/^\//, '')}`;
  }
  return { uri, ...(token && /^https?:/i.test(uri) ? { headers: { Authorization: `Bearer ${token}` } } : {}) };
};
