import { request } from './client';
export const getAdminSummary = (token) => request('/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });

