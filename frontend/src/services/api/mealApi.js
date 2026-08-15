import { request } from './client';
export const getMeals = (token) => request('/meals/today', { headers: { Authorization: `Bearer ${token}` } });

