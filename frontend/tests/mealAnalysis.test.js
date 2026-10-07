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
test('regular meals show per-100-g nutrition and require manually entered portion weights', async () => {
  const analyze = captured(async ({ token }) => { assert.equal(token, 'jwt'); return { source: 'live', name: 'Roti, Dal', items: [
    { name: 'Roti', standardPortion: '1 medium', portionGrams: 30, calories: 100, protein: 3, carbs: 20, fat: 1 },
    { name: 'Dal', standardPortion: '1 katori', portionGrams: 150, calories: 160, protein: 9, carbs: 20, fat: 5 },
  ] }; });
  for (const type of ['Breakfast', 'Lunch', 'Dinner', 'Snacks']) {
    const result = await analyze({ uri: 'photo', meal: { type }, token: 'jwt' });
    assert.equal(result.source, 'live'); assert.equal(result.items.length, 2);
    assert.equal(result.items[1].consumedGrams, ''); assert.equal(result.items[1].portionGrams, 100);
    assert.equal(result.items[0].calories, 100 * 100 / 30);
    assert.equal(result.calories, 0); assert.equal(helpers.hasValidFoodPortions(result), false);
  }
});
test('manually entered gram weights scale per-100-g nutrients and excluded foods do not count', () => {
  let result = helpers.withPortionInputs({ items: [
    { name: 'Roti', calories: 100, protein: 3, carbs: 20, fat: 1 },
    { name: 'Dal', calories: 160, protein: 9, carbs: 20, fat: 5 },
  ] });
  result = helpers.changeFoodPortion(result, 0, '250');
  assert.equal(result.calories, 250); assert.equal(result.protein, 7.5);
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
    assert.equal(result.calories, 0, value);
  }
  assert.equal(helpers.hasValidFoodPortions(helpers.changeFoodPortion(initial, 0, '2000')), true);
  assert.equal(helpers.hasValidFoodPortions(helpers.toggleFoodExcluded(initial, 0)), false);
});
test('recognition failures preserve manual entry with the actual reason, never pretend to detect food', async () => {
  const analyze = captured(async () => { throw new Error('No food could be identified.'); });
  const result = await analyze({ meal: { type: 'Lunch', name: 'Planned meal', calories: 300 } });
  assert.equal(result.source, 'manual'); assert.equal(result.name, 'Planned meal'); assert.equal(result.items.length, 0);
  assert.match(result.warning, /No food/);
});
