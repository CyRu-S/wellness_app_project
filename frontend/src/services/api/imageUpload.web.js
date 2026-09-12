export async function appendImage(form, photo) {
  const response = await fetch(photo.uri);
  if (!response.ok) throw new Error('Unable to read the selected image');
  form.append('image', await response.blob(), photo.fileName || 'photo.jpg');
}
