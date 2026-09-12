import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChartData, createRhythmPaths } from '../src/utils/chartData.js';

test('empty charts have no fabricated points', () => {
  assert.deepEqual(normalizeChartData(undefined), []);
  assert.deepEqual(createRhythmPaths([], 320).points, []);
});
test('invalid and negative values cannot break rendering', () => {
  const data = normalizeChartData([{ value: '25' }, { value: NaN }, { value: -4 }, { value: Infinity }, null]);
  assert.deepEqual(data.map((item) => item.value), [25, 0, 0, 0, 0]);
  assert.ok(!/NaN|Infinity/.test(createRhythmPaths(data, 320).linePath));
});
test('zero activity stays on the baseline and percentages use a 100 percent scale', () => {
  const chart = createRhythmPaths(normalizeChartData([{ label: 'Mon', value: 0 }, { label: 'Tue', value: 50 }, { label: 'Wed', value: 100 }]), 320);
  assert.deepEqual(chart.points.map((p) => p.y), [113, 62.5, 12]);
  assert.equal(chart.peak.label, 'Wed');
});
test('single point is visible in the center; layout waits for a valid width', () => {
  assert.equal(createRhythmPaths([{ value: 10 }], 320).points[0].x, 160);
  assert.deepEqual(createRhythmPaths([{ value: 10 }], 0).points, []);
});
test('thirty-day and seven-day series retain every date', () => {
  for (const length of [7, 30]) {
    const data = normalizeChartData(Array.from({ length }, (_, index) => ({ label: String(index + 1), value: index })));
    const chart = createRhythmPaths(data, 320, 30);
    assert.equal(chart.points.length, length);
    assert.equal(chart.points.at(-1).x, 315);
  }
});
