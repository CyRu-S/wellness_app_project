import { request } from './client';
import { appendImage } from './imageUpload';

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

export async function uploadProfilePhoto(token, photo) {
  const form = new FormData();
  await appendImage(form, photo);
  return request('/profile/photo', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}
