import { request } from './client';
export const createActivity = (token, activity) => request('/activities', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(activity) });

