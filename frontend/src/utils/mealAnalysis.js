export function isManualProduct(value) {
  const category = typeof value === 'string' ? value : value?.type;
  return /^(product|herbalife|herbalife product)$/i.test(String(category || '').trim());
}
export function manualMealAnalysis(meal = {}, warning) {
  return { name: meal.name || '', calories: meal.calories || 0, protein: meal.protein || 0,
    carbs: meal.carbs || 0, fat: meal.fat || 0, confidence: 0, items: [], source: 'manual',
    warning: warning || 'Enter the nutrition for the serving you used, using the product label or your plan.' };
}
export function withStandardServings(analysis) {
  return { ...analysis, items: (analysis.items || []).map((item) => ({ ...item, servings: 1 })) };
}
export function changeFoodServings(analysis, index, count) {
  const servings = Math.min(5, Math.max(0, Math.round(count * 2) / 2));
  const items = analysis.items.map((item, position) => position === index ? { ...item, servings } : item);
  const included = items.filter((item) => item.servings > 0);
  const total = (key) => Math.round(items.reduce((sum, item) => sum + item[key] * item.servings, 0) * 10) / 10;
  return { ...analysis, items, name: included.map((item) => item.name).join(', ').slice(0, 200),
    calories: total('calories'), protein: total('protein'), carbs: total('carbs'), fat: total('fat') };
}
