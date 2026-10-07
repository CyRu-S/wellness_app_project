import { isManualProduct, manualMealAnalysis } from '../../utils/mealAnalysis';
import { appendImage } from './imageUpload';
import { request } from './client';
export async function analyzeMealPhoto({ uri, category = 'meal', token }) {
  if (isManualProduct(category)) return manualMealAnalysis();
  const form = new FormData();
  form.append('category', category);
  await appendImage(form, { uri, fileName: 'meal.jpg' });
  return { ...await request('/meals/analyze', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
    timeoutMs: 120000 }), source: 'live' };
}
