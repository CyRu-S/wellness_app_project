import { request } from './client';

export const getProfile = (token) => request('/profile', { headers: { Authorization: `Bearer ${token}` } });

export const updateProfileDetails = (token, profile) => request('/profile', {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(profile),
});

export const updateBodyMetrics = (token, metrics) => request('/profile/body-metrics', {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(metrics),
});
