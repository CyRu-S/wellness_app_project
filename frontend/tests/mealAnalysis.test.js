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
test('regular meals retain each detected dish and initialize one standard serving', async () => {
  const analyze = captured(async ({ token }) => { assert.equal(token, 'jwt'); return { source: 'live', name: 'Roti, Dal', items: [
    { name: 'Roti', standardPortion: '1 medium', portionGrams: 30, calories: 100, protein: 3, carbs: 20, fat: 1 },
    { name: 'Dal', standardPortion: '1 katori', portionGrams: 150, calories: 160, protein: 9, carbs: 20, fat: 5 },
  ] }; });
  for (const type of ['Breakfast', 'Lunch', 'Dinner', 'Snacks']) {
    const result = await analyze({ uri: 'photo', meal: { type }, token: 'jwt' });
    assert.equal(result.source, 'live'); assert.equal(result.items.length, 2);
    assert.equal(result.items[1].servings, 1); assert.equal(result.items[1].portionGrams, 150);
  }
});
test('serving adjustments recalculate totals and excluded dishes are omitted from the saved name', () => {
  let result = helpers.withStandardServings({ items: [
    { name: 'Roti', calories: 100, protein: 3, carbs: 20, fat: 1 },
    { name: 'Dal', calories: 160, protein: 9, carbs: 20, fat: 5 },
  ] });
  result = helpers.changeFoodServings(result, 0, 2);
  assert.equal(result.calories, 360); assert.equal(result.protein, 15);
  result = helpers.changeFoodServings(result, 1, 0);
  assert.equal(result.calories, 200); assert.equal(result.name, 'Roti');
  result = helpers.changeFoodServings(result, 0, 0.5);
  assert.equal(result.calories, 50); assert.equal(result.protein, 1.5);
  assert.equal(helpers.changeFoodServings(result, 0, -2).calories, 0);
});
test('recognition failures preserve manual entry with the actual reason, never pretend to detect food', async () => {
  const analyze = captured(async () => { throw new Error('No food could be identified.'); });
  const result = await analyze({ meal: { type: 'Lunch', name: 'Planned meal', calories: 300 } });
  assert.equal(result.source, 'manual'); assert.equal(result.name, 'Planned meal'); assert.equal(result.items.length, 0);
  assert.match(result.warning, /No food/);
});
