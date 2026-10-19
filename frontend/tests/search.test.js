import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';

const { matchesSearch, normalizeSearchText } = loadModule('../src/utils/search.js');

test('search is case, punctuation, accent, and word-order tolerant', () => {
  assert.equal(normalizeSearchText('  José\u2019s Plan '), 'jose s plan');
  assert.equal(matchesSearch('protein priya', 'Priya Rao', 'High-Protein Plan'), true);
  assert.equal(matchesSearch('rao low', 'Priya Rao', 'High protein'), false);
});
