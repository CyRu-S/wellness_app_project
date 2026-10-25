import test from 'node:test';
import assert from 'node:assert/strict';
import * as toolkit from '@reduxjs/toolkit';
import { loadModule } from './loadModule.js';

function setup() {
  const toast = loadModule('../src/store/slices/toastSlice.js', { '@reduxjs/toolkit': toolkit });
  let token = 'member-a';
  const store = toolkit.configureStore({ reducer: { auth: () => ({ token }), toast: toast.default } });
  const feedback = loadModule('../src/utils/appFeedback.js', {
    '../store': { store }, '../store/slices/toastSlice': toast,
    '../i18n/LanguageContext': { getActiveLanguage: () => 'en' },
    '../i18n/displayTranslations': { translateUiText: (_, value) => value },
  });
  return { store, toast, ...feedback, switchAccount: () => { token = 'member-b'; store.dispatch({ type: 'test/switch' }); } };
}

test('routine alerts become non-celebrating top notifications and single acknowledgement callbacks continue', () => {
  const app = setup(); let navigated = false;
  app.presentAppAlert('Password reset', 'Saved', [{ text: 'Sign in', onPress: () => { navigated = true; } }]);
  assert.equal(navigated, true);
  assert.equal(app.store.getState().toast.current.title, 'Password reset');
  assert.equal(app.store.getState().toast.current.celebrate, false);
  app.presentAppAlert('Reminder not sent', 'Request timed out');
  assert.equal(app.store.getState().toast.current.kind, 'error');
  assert.equal(app.store.getState().toast.dialog, null);
});

test('destructive choices require an explicit action, dismiss safely, and cannot execute twice', () => {
  const app = setup(); let deleted = 0, cancelled = 0;
  const buttons = [{ text: 'Cancel', style: 'cancel', onPress: () => cancelled++ },
    { text: 'Delete', style: 'destructive', onPress: () => deleted++ }];
  app.presentAppAlert('Delete post?', 'Cannot be undone.', buttons);
  assert.equal(deleted, 0);
  assert.ok(!JSON.stringify(app.store.getState().toast.dialog).includes('onPress'));
  const first = app.store.getState().toast.dialog.id;
  app.chooseAppDialog(first);
  assert.equal(cancelled, 1); assert.equal(deleted, 0);
  app.presentAppAlert('Delete post?', 'Cannot be undone.', buttons);
  const second = app.store.getState().toast.dialog.id;
  app.chooseAppDialog(first, 1);
  assert.equal(deleted, 0, 'stale choices must not act on a replacement');
  app.chooseAppDialog(second, 1); app.chooseAppDialog(second, 1);
  assert.equal(deleted, 1);
  assert.equal(app.store.getState().toast.dialog, null);
});

test('a confirmation created by a previous account cannot execute after an account switch', () => {
  const app = setup(); let acted = false;
  app.presentAppAlert('Clear?', 'History', [{ text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: () => { acted = true; } }]);
  const id = app.store.getState().toast.dialog.id;
  app.switchAccount(); app.chooseAppDialog(id, 1);
  assert.equal(acted, false);
});

test('celebrations stay enabled for meal completion and stale dismissals preserve newer messages', () => {
  const app = setup();
  app.store.dispatch(app.toast.showToast({ kind: 'meal', title: 'Meal posted' }));
  const first = app.store.getState().toast.current.id;
  assert.equal(app.store.getState().toast.current.celebrate, true);
  app.presentAppAlert('Preferences saved', 'Updated');
  app.store.dispatch(app.toast.clearToast(first));
  assert.equal(app.store.getState().toast.current.title, 'Preferences saved');
});
