import test from 'node:test';
import assert from 'node:assert/strict';
import { translate, translations } from '../src/i18n/translations.js';

test('settings translations switch between English and Telugu script', () => {
  assert.equal(translate('en', 'language'), 'Language');
  assert.equal(translate('te', 'language'), 'భాష');
  assert.equal(translate('te', 'settings'), 'సెట్టింగులు');
  assert.equal(translate('te', 'todayMealPlan', { value: 42 }), 'ఈ రోజు భోజన ప్రణాళిక: 42% నమోదుైంది');
  assert.match(translations.te.signOutAdmin, /[\u0C00-\u0C7F]/);
});

test('missing Telugu entries fall back to English', () => {
  assert.equal(translate('te', 'unknown-key'), 'unknown-key');
  assert.equal(translate('invalid', 'language'), 'Language');
});
