import test from 'node:test';
import assert from 'node:assert/strict';
import { groupMealFollowUps } from '../src/utils/mealFollowUps.js';

test('multiple alerts for one member produce one stable row with all details', () => {
  const alerts = [
    { memberId: 7, name: 'Member', initials: 'M', detail: 'Breakfast overdue', severity: 'MEDIUM' },
    { memberId: 7, name: 'Member', initials: 'M', detail: 'Lunch overdue', severity: 'HIGH' },
    { memberId: 7, name: 'Member', initials: 'M', detail: 'Breakfast overdue', severity: 'MEDIUM' },
  ];
  const original = structuredClone(alerts);
  assert.deepEqual(groupMealFollowUps(alerts), [{
    memberId: 7, name: 'Member', initials: 'M', detail: 'Breakfast overdue; Lunch overdue', severity: 'HIGH',
  }]);
  assert.deepEqual(alerts, original, 'Redux data must not be mutated');
});

test('member keys stay unique even with numeric and string IDs', () => {
  const rows = groupMealFollowUps([
    { memberId: 7, detail: 'Breakfast' },
    { memberId: '7', detail: 'Lunch' },
    { memberId: 8, detail: 'Dinner' },
  ]);
  assert.deepEqual(rows.map((row) => row.memberId), [7, 8]);
  assert.equal(new Set(rows.map((row) => String(row.memberId))).size, rows.length);
});

test('empty lists stay empty and entries without a member cannot create broken links', () => {
  assert.deepEqual(groupMealFollowUps(), []);
  assert.deepEqual(groupMealFollowUps([null, {}]), []);
});

test('removing an alert on refresh updates details and urgency', () => {
  const remaining = { memberId: 7, detail: 'Lunch overdue', severity: 'MEDIUM' };
  groupMealFollowUps([{ ...remaining, detail: 'Breakfast overdue', severity: 'HIGH' }, remaining]);
  assert.deepEqual(groupMealFollowUps([remaining]), [remaining]);
});
