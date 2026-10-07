export function isManualProduct(value) {
  const category = typeof value === 'string' ? value : value?.type;
  return /^(product|herbalife|herbalife product)$/i.test(String(category || '').trim());
}
export function manualMealAnalysis(meal = {}, warning) {
  return { name: meal.name || '', calories: meal.calories || 0, protein: meal.protein || 0,
    carbs: meal.carbs || 0, fat: meal.fat || 0, confidence: 0, items: [], source: 'manual',
    warning: warning || 'Enter the nutrition for the serving you used, using the product label or your plan.' };
}
const nutrientKeys = ['calories', 'protein', 'carbs', 'fat'];
export function portionWeight(value) {
  const text = String(value ?? '').trim();
  if (!/^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(text)) return null;
  const grams = Number(text.replace(',', '.'));
  return Number.isFinite(grams) && grams > 0 && grams <= 2000 ? grams : null;
}
export function hasValidFoodPortions(analysis) {
  const included = (analysis.items || []).filter((item) => !item.excluded);
  return included.length > 0 && included.every((item) => portionWeight(item.consumedGrams) !== null);
}
function calculatePortions(analysis, items) {
  const included = items.filter((item) => !item.excluded);
  const total = (key) => Math.round(included.reduce((sum, item) =>
    sum + item[key] * (portionWeight(item.consumedGrams) ?? 0) / 100, 0) * 10) / 10;
  return { ...analysis, items, name: included.map((item) => item.name).join(', ').slice(0, 200),
    calories: total('calories'), protein: total('protein'), carbs: total('carbs'), fat: total('fat') };
}
export function withPortionInputs(analysis) {
  const items = (analysis.items || []).map((item) => {
    // Accept the previous backend's reference weights while an update is being deployed.
    const referenceGrams = Number(item.portionGrams ?? 100);
    if (!Number.isFinite(referenceGrams) || referenceGrams <= 0) throw new Error('Invalid food nutrition reference weight');
    const nutrition = Object.fromEntries(nutrientKeys.map((key) => {
      if (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0) throw new Error('Invalid food nutrition');
      return [key, item[key] * 100 / referenceGrams];
    }));
    return { ...item, ...nutrition, standardPortion: '100 g', portionGrams: 100, consumedGrams: '', excluded: false };
  });
  return calculatePortions({ ...analysis, portionBasis: 'PER_100_G' }, items);
}
export function changeFoodPortion(analysis, index, value) {
  return calculatePortions(analysis, analysis.items.map((item, position) =>
    position === index ? { ...item, consumedGrams: String(value) } : item));
}
export function toggleFoodExcluded(analysis, index) {
  return calculatePortions(analysis, analysis.items.map((item, position) =>
    position === index ? { ...item, excluded: !item.excluded } : item));
}
