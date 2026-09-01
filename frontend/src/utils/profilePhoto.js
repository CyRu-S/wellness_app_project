import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { API_URL } from '../services/api/client';

const imageMimeType = (asset) => {
  if (asset?.mimeType) return asset.mimeType;
  const extension = asset?.uri?.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
};

export async function chooseProfilePhoto() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: Platform.OS !== 'web',
    aspect: [1, 1],
    quality: 0.68,
    base64: Platform.OS !== 'web',
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset?.uri) return null;
  const mimeType = imageMimeType(asset);
  return {
    uri: asset.uri,
    persistentUri: asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri,
    mimeType,
    fileName: asset.fileName || `profile.${mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'}`,
    width: asset.width,
    height: asset.height,
    needsCrop: Platform.OS === 'web',
  };
}

export async function cropProfilePhoto(photo, { viewportSize, zoom, offset }) {
  if (Platform.OS !== 'web' || !photo?.width || !photo?.height) return { ...photo, needsCrop: false };
  const sourceUri = photo.uri;
  const baseScale = Math.max(viewportSize / photo.width, viewportSize / photo.height);
  const renderedScale = baseScale * zoom;
  const renderedWidth = photo.width * renderedScale;
  const renderedHeight = photo.height * renderedScale;
  const sourceSize = viewportSize / renderedScale;
  const sourceX = Math.max(0, Math.min(photo.width - sourceSize, ((renderedWidth - viewportSize) / 2 - offset.x) / renderedScale));
  const sourceY = Math.max(0, Math.min(photo.height - sourceSize, ((renderedHeight - viewportSize) / 2 - offset.y) / renderedScale));
  const browserImage = new globalThis.Image();
  await new Promise((resolve, reject) => {
    browserImage.onload = resolve;
    browserImage.onerror = () => reject(new Error('The selected image could not be cropped.'));
    browserImage.src = sourceUri;
  });
  const canvas = globalThis.document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image cropping is not supported in this browser.');
  context.drawImage(browserImage, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 640, 640);
  const uri = canvas.toDataURL('image/jpeg', 0.84);
  return { uri, persistentUri: uri, mimeType: 'image/jpeg', fileName: 'profile.jpg', width: 640, height: 640, needsCrop: false };
}

export function profileImageSource(value, token, version) {
  if (!value) return null;
  if (typeof value !== 'string') return value;
  let uri = value;
  if (!/^(https?:|file:|data:|blob:)/i.test(value)) {
    const origin = API_URL.replace(/\/api\/?$/, '');
    uri = value.startsWith('/api/') ? `${origin}${value}` : `${API_URL.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
  }
  if (version && /^https?:/i.test(uri)) uri += `${uri.includes('?') ? '&' : '?'}v=${version}`;
  return { uri, ...(token && /^https?:/i.test(uri) ? { headers: { Authorization: `Bearer ${token}` } } : {}) };
}
