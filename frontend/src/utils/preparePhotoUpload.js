import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Resize on the native image worker, without copying camera-sized base64 into JS.
export async function preparePhotoUpload(photo, maxDimension = 1600) {
  const context = ImageManipulator.manipulate(photo.uri);
  let rendered;
  try {
    let width = photo.width, height = photo.height;
    if (!width || !height) {
      rendered = await context.renderAsync();
      width = rendered.width; height = rendered.height;
    }
    if (Math.max(width, height) > maxDimension) {
      context.resize(width >= height ? { width: maxDimension } : { height: maxDimension });
    }
    rendered?.release?.();
    rendered = null;
    rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: false });
    return { ...result, persistentUri: result.uri, mimeType: 'image/jpeg', fileName: 'photo.jpg', needsCrop: false };
  } finally {
    rendered?.release?.();
    context.release?.();
  }
}
