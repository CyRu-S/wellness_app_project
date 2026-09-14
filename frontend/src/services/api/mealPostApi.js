import { appendImage } from './imageUpload';
import { API_URL, request } from './client';
import { primeProtectedImageCache } from '../storage/protectedImageCache';

const imageDetails = (uri) => {
  const extension = uri?.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'png') return { name: 'meal.png', type: 'image/png' };
  if (extension === 'webp') return { name: 'meal.webp', type: 'image/webp' };
  return { name: 'meal.jpg', type: 'image/jpeg' };
};

export async function createMealPost(token, { imageUri, ...metadata }) {
  const form = new FormData();
  const image = imageDetails(imageUri);
  form.append('metadata', JSON.stringify(metadata));

  await appendImage(form, { uri: imageUri, fileName: image.name });

  const post = await request('/meal-posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (post?.imageUrl) {
    const origin = API_URL.replace(/\/api\/?$/, '');
    const uri = post.imageUrl.startsWith('/api/') ? `${origin}${post.imageUrl}` : post.imageUrl;
    await primeProtectedImageCache(uri, `Bearer ${token}`, imageUri);
  }
  return post;
}
