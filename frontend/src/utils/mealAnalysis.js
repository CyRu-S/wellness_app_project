export function isManualProduct(value) {
  const category = typeof value === 'string' ? value : value?.type;
  return /^(product|herbalife|herbalife product)$/i.test(String(category || '').trim());
}
const starterNutrition = {
  // Conservative single-serving starters for familiar Indian meals. These are deliberately
  // modest placeholders (for example idli/upma, rice-dal-sabzi, fruit/tea, or roti-sabzi),
  // never a claim that the photo itself was nutritionally measured.
  breakfast: { calories: 220, protein: 8, carbs: 36, fat: 5 },
  lunch: { calories: 320, protein: 12, carbs: 48, fat: 9 },
  snack: { calories: 110, protein: 4, carbs: 18, fat: 3 },
  snacks: { calories: 110, protein: 4, carbs: 18, fat: 3 },
  dinner: { calories: 280, protein: 11, carbs: 42, fat: 8 },
  'herbalife product': { calories: 180, protein: 15, carbs: 22, fat: 4 },
  product: { calories: 180, protein: 15, carbs: 22, fat: 4 },
};
const positiveOr = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
export function manualMealAnalysis(meal = {}, warning) {
  const type = String(meal.type || 'meal').trim().toLowerCase();
  const estimate = starterNutrition[type] || { calories: 260, protein: 10, carbs: 40, fat: 7 };
  return { name: meal.name || meal.type || 'Meal estimate', calories: positiveOr(meal.calories, estimate.calories),
    protein: positiveOr(meal.protein ?? meal.proteinGrams, estimate.protein),
    carbs: positiveOr(meal.carbs ?? meal.carbsGrams, estimate.carbs), fat: positiveOr(meal.fat ?? meal.fatGrams, estimate.fat),
    confidence: 0, items: [], source: 'manual', nutritionSource: 'starter-estimate',
    warning: warning || 'Starter estimate based on the meal slot. Review and edit it before saving.' };
}
const nutrientKeys = ['calories', 'protein', 'carbs', 'fat'];
export function hasFoodNutrition(item) {
  return item.nutritionAvailable !== false && nutrientKeys.every((key) =>
    typeof item[key] === 'number' && Number.isFinite(item[key]) && item[key] >= 0)
    && (item.calories > 0 || item.nutritionSource === 'manual');
}
export function portionWeight(value) {
  const text = String(value ?? '').trim();
  if (!/^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(text)) return null;
  const grams = Number(text.replace(',', '.'));
  return Number.isFinite(grams) && grams > 0 && grams <= 2000 ? grams : null;
}
export function hasValidFoodPortions(analysis) {
  const included = (analysis.items || []).filter((item) => !item.excluded);
  return included.length > 0 && included.every((item) => hasFoodNutrition(item) && portionWeight(item.consumedGrams) !== null);
}
function calculatePortions(analysis, items) {
  const included = items.filter((item) => !item.excluded);
  const complete = hasValidFoodPortions({ items });
  const total = (key) => !complete ? null : Math.round(included.reduce((sum, item) =>
    sum + item[key] * (portionWeight(item.consumedGrams) ?? 0) / 100, 0) * 10) / 10;
  return { ...analysis, items, name: included.map((item) => item.name).join(', ').slice(0, 200),
    calories: total('calories'), protein: total('protein'), carbs: total('carbs'), fat: total('fat') };
}
export function withPortionInputs(analysis) {
  const items = (analysis.items || []).map((item) => {
    // Accept the previous backend's reference weights while an update is being deployed.
    const referenceGrams = Number(item.portionGrams ?? 100);
    if (!Number.isFinite(referenceGrams) || referenceGrams <= 0) throw new Error('Invalid food nutrition reference weight');
    if (!hasFoodNutrition(item)) return { ...item,
      ...Object.fromEntries(nutrientKeys.map((key) => [key, null])),
      standardPortion: '100 g', portionGrams: 100, consumedGrams: '', excluded: false,
      nutritionAvailable: false, referenceInputs: Object.fromEntries(nutrientKeys.map((key) => [key, ''])) };
    const nutrition = Object.fromEntries(nutrientKeys.map((key) => {
      if (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0) throw new Error('Invalid food nutrition');
      return [key, item[key] * 100 / referenceGrams];
    }));
    return { ...item, ...nutrition, standardPortion: '100 g', portionGrams: 100, consumedGrams: '', excluded: false,
      nutritionAvailable: true, nutritionSource: item.nutritionSource || 'estimated' };
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
export function changeFoodReference(analysis, index, key, value) {
  if (!nutrientKeys.includes(key)) return analysis;
  const items = analysis.items.map((item, position) => {
    if (position !== index) return item;
    const referenceInputs = { ...item.referenceInputs, [key]: String(value) };
    const nutrition = Object.fromEntries(nutrientKeys.map((nutrient) => {
      const text = String(referenceInputs[nutrient] ?? '').trim();
      const number = /^\d+(?:[.,]\d{0,4})?$/.test(text) ? Number(text.replace(',', '.')) : NaN;
      return [nutrient, Number.isFinite(number) && number >= 0 && number <= (nutrient === 'calories' ? 1000 : 100) ? number : null];
    }));
    const nutritionAvailable = nutrientKeys.every((nutrient) => nutrition[nutrient] !== null)
      && nutrition.protein + nutrition.carbs + nutrition.fat <= 115;
    return { ...item, ...nutrition, referenceInputs, nutritionAvailable, nutritionSource: 'manual' };
  });
  return calculatePortions(analysis, items);
}
export function editFoodReference(analysis, index) {
  return calculatePortions(analysis, analysis.items.map((item, position) => position !== index ? item : {
    ...item, nutritionSource: 'manual',
    referenceInputs: Object.fromEntries(nutrientKeys.map((key) => [key, item[key] === null ? '' : String(item[key])])),
  }));
}
