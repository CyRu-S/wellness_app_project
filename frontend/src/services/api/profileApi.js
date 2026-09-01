import { request } from './client';
import { Platform } from 'react-native';

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
  if (Platform.OS === 'web') {
    const imageResponse = await fetch(photo.uri);
    form.append('image', await imageResponse.blob(), photo.fileName);
  } else {
    form.append('image', { uri: photo.uri, name: photo.fileName, type: photo.mimeType });
  }
  return request('/profile/photo', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}
