import { request } from './client';
export const getPlan = (token) => request('/plans/today', { headers: { Authorization: `Bearer ${token}` } });

