import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNutrition } from '../src/utils/formatNutrition.js';
import { notificationDestination } from '../src/utils/notificationDestination.js';

test('admin photo captions keep decimal nutrition without rounding to integers', () => {
  assert.equal(formatNutrition(123.75), '123.75');
  assert.equal(formatNutrition('7.125'), '7.125');
  assert.equal(formatNutrition(8), '8.0');
});

test('member overdue and nudge notifications open the meal timeline', () => {
  for (const kind of ['DEADLINE', 'NUDGE']) {
    assert.deepEqual(notificationDestination('USER', kind), { name: 'Log', params: { screen: 'TodayTimeline' } });
  }
});
