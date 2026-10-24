const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PASSTHROUGH_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const photoType = (photo) => (photo.mimeType || photo.file?.type || '').toLowerCase();

// Safari can render some iPhone HDR photos correctly in an <img> but turn them
// black when that image is redrawn through a canvas. Keep an already-supported
// browser File intact; only use canvas conversion for unsupported or oversized
// files that really need it.
export async function preparePhotoUpload(photo, maxDimension = 1600) {
  const mimeType = photoType(photo);
  const fileSize = photo.fileSize ?? photo.file?.size;
  if (PASSTHROUGH_TYPES.has(mimeType) && (!fileSize || fileSize <= MAX_UPLOAD_BYTES)) {
    return {
      ...photo,
      persistentUri: photo.uri,
      mimeType,
      fileName: photo.fileName || `photo.${mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'}`,
      needsCrop: false,
    };
  }

  const image = new globalThis.Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('This photo could not be opened. Choose a JPEG or PNG image.'));
    image.src = photo.uri;
  });
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image preparation is unavailable in this browser.');
  // JPEG has no alpha channel. Paint a light background first so transparent
  // iPhone PNGs do not flatten to black in Safari/PWA uploads.
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const uri = canvas.toDataURL('image/jpeg', 0.8);
  return { ...photo, uri, persistentUri: uri, width: canvas.width, height: canvas.height,
    mimeType: 'image/jpeg', fileName: 'photo.jpg', needsCrop: false };
}
