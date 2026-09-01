import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mr_care/profile_photos';

const keysFor = (user = {}) => [
  user.id != null ? `id:${user.id}` : null,
  user.email ? `email:${user.email.trim().toLowerCase()}` : null,
].filter(Boolean);

export async function getDemoProfilePhotos() {
  try {
    return JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export async function getDemoProfilePhoto(user) {
  const photos = await getDemoProfilePhotos();
  return keysFor(user).map((key) => photos[key]).find(Boolean) || null;
}

export async function setDemoProfilePhoto(user, uri) {
  if (!uri) return null;
  const photos = await getDemoProfilePhotos();
  const [primaryKey, ...aliases] = keysFor(user);
  if (!primaryKey) return null;
  aliases.forEach((key) => { delete photos[key]; });
  photos[primaryKey] = uri;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  return uri;
}
