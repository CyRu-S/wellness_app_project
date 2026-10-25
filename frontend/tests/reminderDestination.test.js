import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';

const module = loadModule('../src/utils/notificationDestination.js', {});
// Normalize objects returned from the isolated test VM before strict comparison.
const notificationDestination = (...args) => JSON.parse(JSON.stringify(module.notificationDestination(...args)));

test('member overdue reminders open the timeline while pre-meal reminders open the assigned meal', () => {
  assert.deepEqual(notificationDestination('USER', 'DEADLINE'), {
    name: 'Log', params: { screen: 'TodayTimeline' },
  });
  assert.deepEqual(notificationDestination('USER', 'MEAL', { targetId: '42' }), {
    name: 'Log', params: { screen: 'MealCapture', params: { category: 'meal', targetMealId: 42 } },
  });
});

test('admin overdue alerts retain their admin destination', () => {
  assert.deepEqual(notificationDestination('ADMIN', 'DEADLINE'), {
    name: 'AdminTabs', params: { screen: 'Alerts' },
  });
});
