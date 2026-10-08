import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';
import * as helpers from '../src/utils/mealAnalysis.js';

function captured(analyzeMealPhoto) {
  return loadModule('../src/services/api/capturedMealAnalysis.js', {
    './mealAnalysisApi': { analyzeMealPhoto }, '../../utils/mealAnalysis': helpers,
  }).analyzeCapturedMeal;
}
test('Herbalife photo entries use the editable plan defaults and never call AI', async () => {
  let requests = 0;
  const analyze = captured(async () => { requests++; });
  const result = await analyze({ uri: 'file:///product.jpg', meal: { type: 'Herbalife product', name: 'Formula 1', calories: 120, protein: 10 } });
  assert.equal(requests, 0); assert.equal(result.source, 'manual');
  assert.equal(result.name, 'Formula 1'); assert.equal(result.calories, 120);
  assert.match(result.warning, /label/);
});
test('direct product analysis calls also bypass image upload and the backend', async () => {
  let requests = 0;
  const api = loadModule('../src/services/api/mealAnalysisApi.js', {
    './imageUpload': { appendImage: () => { requests++; } }, './client': { request: () => { requests++; } },
    '../../utils/mealAnalysis': helpers,
  });
  assert.equal((await api.analyzeMealPhoto({ uri: 'file:///product.jpg', category: 'product' })).source, 'manual');
  assert.equal(requests, 0);
});
test('all meal categories open manual nutrition immediately without any AI request', async () => {
  let requests = 0;
  const analyze = captured(async () => { requests++; throw new Error('AI must remain unused'); });
  for (const type of ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Herbalife product']) {
    const result = await analyze({ uri: 'photo', meal: { type, name: 'Planned serving', calories: 250, protein: 12 }, token: 'jwt' });
    assert.equal(result.source, 'manual'); assert.equal(result.name, 'Planned serving');
    assert.equal(result.items.length, 0); assert.equal(result.calories, 250);
  }
  assert.equal(requests, 0);
});

test('manually entered gram weights scale per-100-g nutrients and excluded foods do not count', () => {
  let result = helpers.withPortionInputs({ items: [
    { name: 'Roti', calories: 100, protein: 3, carbs: 20, fat: 1 },
    { name: 'Dal', calories: 160, protein: 9, carbs: 20, fat: 5 },
  ] });
  result = helpers.changeFoodPortion(result, 0, '250');
  assert.equal(result.calories, null); assert.equal(result.protein, null);
  assert.equal(helpers.hasValidFoodPortions(result), false);
  result = helpers.changeFoodPortion(result, 1, '150');
  assert.equal(result.calories, 490); assert.equal(result.protein, 21);
  assert.equal(helpers.hasValidFoodPortions(result), true);
  result = helpers.toggleFoodExcluded(result, 1);
  assert.equal(result.calories, 250); assert.equal(result.name, 'Roti');
  result = helpers.changeFoodPortion(result, 0, '50,5');
  assert.equal(result.calories, 50.5); assert.equal(result.protein, 1.5);
  result = helpers.toggleFoodExcluded(result, 1);
  assert.equal(result.calories, 290.5); assert.equal(result.name, 'Roti, Dal');
  assert.equal(result.items[1].calories, 160);
});
test('invalid, missing and zero portion weights cannot be saved as valid meals', () => {
  const initial = helpers.withPortionInputs({ items: [{ name: 'Dal', calories: 160, protein: 9, carbs: 20, fat: 5 }] });
  for (const value of ['', '0', '-10', 'abc', 'Infinity', '2000.01', '1.234', '1e2']) {
    const result = helpers.changeFoodPortion(initial, 0, value);
    assert.equal(helpers.hasValidFoodPortions(result), false, value);
    assert.equal(result.calories, null, value);
  }
  assert.equal(helpers.hasValidFoodPortions(helpers.changeFoodPortion(initial, 0, '2000')), true);
  assert.equal(helpers.hasValidFoodPortions(helpers.toggleFoodExcluded(initial, 0)), false);
});
test('manual entry works while recognition is unavailable', async () => {
  const analyze = captured(async () => { throw new Error('No food could be identified.'); });
  const result = await analyze({ meal: { type: 'Lunch', name: 'Planned meal', calories: 300 } });
  assert.equal(result.source, 'manual'); assert.equal(result.name, 'Planned meal'); assert.equal(result.items.length, 0);
  assert.match(result.warning, /Enter the nutrition/);
});

test('laddu reference remains visible before weight entry and scales to the eaten portion', () => {
  let result = helpers.withPortionInputs({ items: [{ name: 'Laddu', calories: 506, protein: 8.4, carbs: 63.42, fat: 24.32,
    nutritionAvailable: true, nutritionSource: 'reference', nutritionReference: 'Besan laddu reference' }] });
  assert.equal(result.items[0].calories, 506);
  assert.equal(result.items[0].nutritionSource, 'reference');
  assert.equal(result.items[0].nutritionReference, 'Besan laddu reference');
  assert.equal(result.calories, null);
  result = helpers.changeFoodPortion(result, 0, '40');
  assert.equal(result.calories, 202.4); assert.equal(result.protein, 3.4);
  assert.equal(result.carbs, 25.4); assert.equal(result.fat, 9.7);
  assert.equal(helpers.hasValidFoodPortions(result), true);
});

test('zero or missing model nutrition keeps the detected name and requires a manual reference', async () => {
  for (const nutrition of [
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
    { calories: null, protein: null, carbs: null, fat: null, nutritionAvailable: false },
    { calories: 50, protein: 1, carbs: 10, fat: 0, nutritionAvailable: false },
  ]) {
    let result = helpers.withPortionInputs({ source: 'manual', items: [{ name: 'Laddu', ...nutrition }] });
    assert.equal(result.name, 'Laddu'); assert.equal(result.items[0].calories, null);
    assert.equal(helpers.hasFoodNutrition(result.items[0]), false);
    assert.equal(result.items[0].referenceInputs.calories, '');
    result = helpers.changeFoodPortion(result, 0, '50');
    assert.equal(result.calories, null); assert.equal(helpers.hasValidFoodPortions(result), false);
    for (const [key, value] of Object.entries({ calories: '506', protein: '8,4', carbs: '63.42', fat: '24.32' })) {
      result = helpers.changeFoodReference(result, 0, key, value);
    }
    assert.equal(result.calories, 253); assert.equal(result.protein, 4.2);
    assert.equal(helpers.hasValidFoodPortions(result), true);
    assert.equal(result.items[0].nutritionSource, 'manual');
  }
});

test('a missing food reference prevents misleading partial totals until corrected or excluded', () => {
  let result = helpers.withPortionInputs({ items: [
    { name: 'Dal', calories: 160, protein: 9, carbs: 20, fat: 5 },
    { name: 'Unknown sweet', nutritionAvailable: false },
  ] });
  result = helpers.changeFoodPortion(result, 0, '100');
  result = helpers.changeFoodPortion(result, 1, '40');
  assert.equal(result.calories, null); assert.equal(helpers.hasValidFoodPortions(result), false);
  result = helpers.toggleFoodExcluded(result, 1);
  assert.equal(result.calories, 160); assert.equal(result.name, 'Dal');
  assert.equal(helpers.hasValidFoodPortions(result), true);
  result = helpers.toggleFoodExcluded(result, 1);
  assert.equal(result.calories, null); assert.equal(result.items[1].consumedGrams, '40');
});

test('editing reference values retains the portion and recalculates the total', () => {
  let result = helpers.withPortionInputs({ items: [{ name: 'Laddu', calories: 506, protein: 8.4, carbs: 63.42, fat: 24.32, nutritionSource: 'reference' }] });
  result = helpers.changeFoodPortion(result, 0, '40');
  result = helpers.editFoodReference(result, 0);
  assert.equal(result.items[0].referenceInputs.calories, '506');
  assert.equal(result.items[0].referenceInputs.carbs, '63.42');
  assert.equal(result.items[0].consumedGrams, '40');
  assert.equal(result.calories, 202.4);
  result = helpers.changeFoodReference(result, 0, 'calories', '450');
  assert.equal(result.calories, 180);
  for (const value of ['', '-1', '1000.01', '1e2', '1.12345', 'Infinity']) {
    const invalid = helpers.changeFoodReference(result, 0, 'calories', value);
    assert.equal(helpers.hasValidFoodPortions(invalid), false, value);
    assert.equal(invalid.calories, null, value);
  }
  assert.equal(helpers.hasValidFoodPortions(helpers.changeFoodReference(result, 0, 'fat', '100.01')), false);
  assert.equal(helpers.hasValidFoodPortions(helpers.changeFoodReference(result, 0, 'carbs', '100')), false);
});

test('explicit manual zero values are accepted but automatic zero placeholders are not', () => {
  let result = helpers.withPortionInputs({ items: [{ name: 'Unsweetened tea', calories: 0, protein: 0, carbs: 0, fat: 0 }] });
  result = helpers.changeFoodPortion(result, 0, '100');
  assert.equal(helpers.hasValidFoodPortions(result), false);
  for (const key of ['calories', 'protein', 'carbs', 'fat']) result = helpers.changeFoodReference(result, 0, key, '0');
  assert.equal(helpers.hasValidFoodPortions(result), true);
  assert.equal(result.calories, 0);
});
