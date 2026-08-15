import { request } from './client';
export const getNotifications = (token) => request('/notifications', { headers: { Authorization: `Bearer ${token}` } });

