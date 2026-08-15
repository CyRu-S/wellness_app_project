import { request } from './client';
export const getDashboard = (token) => request('/dashboard', { headers: { Authorization: `Bearer ${token}` } });

