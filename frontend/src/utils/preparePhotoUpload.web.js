// Normalize browser camera/library images to the same size and format as native uploads.
export async function preparePhotoUpload(photo, maxDimension = 1600) {
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
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const uri = canvas.toDataURL('image/jpeg', 0.8);
  return { ...photo, uri, persistentUri: uri, width: canvas.width, height: canvas.height,
    mimeType: 'image/jpeg', fileName: 'photo.jpg', needsCrop: false };
}
