import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('English and Telugu toggle is available in member and admin settings', async () => {
  const [member, admin, toggle] = await Promise.all([
    source('../src/screens/user/ProfileScreen.jsx'),
    source('../src/screens/admin/AdminSettingsScreen.jsx'),
    source('../src/components/common/LanguageToggle.jsx'),
  ]);
  assert.match(member, /<LanguageToggle/);
  assert.match(admin, /<LanguageToggle admin/);
  assert.match(toggle, /\['en'/);
  assert.match(toggle, /\['te'/);
});

test('healthy habits have one dedicated add path and no category selector', async () => {
  const editor = await source('../src/screens/admin/UserDetailsScreen.jsx');
  assert.match(editor, /addItem\('HEALTHY_HABIT'\)/);
  assert.doesNotMatch(editor, /HABIT_CATEGORIES|No category|changeItem\(index, 'kind'/);
  assert.match(editor, /Add one daily wellbeing action with its reminder time/);
});

test('admin settings never exposes admin account deletion while member deletion remains available', async () => {
  const [settings, details] = await Promise.all([
    source('../src/screens/admin/AdminSettingsScreen.jsx'),
    source('../src/screens/admin/UserDetailsScreen.jsx'),
  ]);
  assert.doesNotMatch(settings, /deleteCurrentAccount|Delete admin account/);
  assert.match(details, /Delete member account/);
});

test('theme ringtone is configurable and the test notification control is removed', async () => {
  const [nativeSettings, webSettings, preferences, app] = await Promise.all([
    source('../src/components/user/NotificationSettings.jsx'),
    source('../src/components/user/NotificationSettings.web.jsx'),
    source('../src/store/slices/notificationSlice.js'),
    source('../app.json'),
  ]);
  assert.match(nativeSettings, /customSound/);
  assert.match(webSettings, /customSound/);
  assert.match(preferences, /customSound: true/);
  assert.doesNotMatch(webSettings, /sendTestNotification|Send test notification/);
  assert.doesNotMatch(preferences, /sendTestNotification|notifications\/test/);
  assert.match(app, /main_theme_alert\.mp3/);
});
