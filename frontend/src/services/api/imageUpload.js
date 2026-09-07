import { File } from 'expo-file-system';

// Expo SDK 57's fetch expects a Blob/File, not React Native's old { uri } part.
export async function appendImage(form, photo) {
  form.append('image', new File(photo.uri));
}
