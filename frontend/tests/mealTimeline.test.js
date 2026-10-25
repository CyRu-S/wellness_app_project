import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMealTimeline } from '../src/utils/mealTimeline.js';

const now = new Date('2026-10-25T12:00:00+05:30');
const plans = [{ id: 1, name: 'Breakfast', hour: 8 }, { id: 2, name: 'Lunch', hour: 13 }, { id: 3, name: 'Dinner', hour: 20 }];
const post = (id, clock) => ({ id, mealType: 'Outside food', mealName: `Outside ${id}`, postedAt: `2026-10-25T${clock}+05:30` });

test('outside food is tagged and placed between its surrounding plan slots, including before/after the schedule', () => {
  const posts = [post(1, '10:00:00'), post(2, '15:30:00'), post(3, '07:00:00'), post(4, '22:00:00')];
  const timeline = buildMealTimeline(plans, posts, now);
  assert.deepEqual(timeline.map((item) => item.name), ['Outside 3', 'Breakfast', 'Outside 1', 'Lunch', 'Outside 2', 'Dinner', 'Outside 4']);
  const outside = timeline.find((item) => item.id === 'outside-1');
  assert.equal(outside.type, 'Outside food'); assert.equal(outside.postId, 1); assert.equal(outside.consumed, true);
  assert.equal(outside.outsideFood, true); assert.equal(outside.hour, 10);
  assert.equal(plans.length, 3); assert.equal(posts.length, 4);
});

test('only today’s outside posts enter the timeline and normal planned posts are never duplicated', () => {
  const posts = [post(1, '10:00:00'), { ...post(2, '11:00:00'), mealType: 'Lunch', plannedMealId: 2 },
    { ...post(3, '10:00:00'), postedAt: '2026-10-24T18:29:59Z' },
    { ...post(4, '10:00:00'), postedAt: '2026-10-25T18:30:00Z' },
    { ...post(5, '10:00:00'), postedAt: 'invalid' }];
  assert.deepEqual(buildMealTimeline(plans, posts, now).map((item) => item.id), [1, 'outside-1', 2, 3]);
  assert.equal(buildMealTimeline([], posts, now).length, 1);
});

test('same-time outside posts follow the scheduled slot and disappear from tomorrow’s timeline', () => {
  assert.deepEqual(buildMealTimeline(plans, [post(7, '13:00:00')], now).map((item) => item.id), [1, 2, 'outside-7', 3]);
  assert.deepEqual(buildMealTimeline(plans, [post(7, '13:00:00')], new Date('2026-10-26T00:00:00+05:30')), plans);
});
