import { appendImage } from './imageUpload';
import { request } from './client';
export async function analyzeMealPhoto({ uri, category = 'meal', token }) {
  const form = new FormData();
  form.append('category', category);
  await appendImage(form, { uri, fileName: 'meal.jpg' });
  return { ...await request('/meals/analyze', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }), source: 'live' };
}
