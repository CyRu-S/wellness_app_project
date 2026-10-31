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

test('coach exercise is removed from the diet editor and available in Move', async () => {
  const [editor, activity] = await Promise.all([
    source('../src/screens/admin/UserDetailsScreen.jsx'),
    source('../src/screens/user/ActivityTimerScreen.jsx'),
  ]);
  assert.doesNotMatch(editor, /addItem\('ACTIVITY'\)/);
  assert.doesNotMatch(editor, /Add coach exercise/);
  assert.match(activity, /Exercise with coach/);
  assert.match(activity, /coachExercises/);
  assert.match(activity, /completeHealthyHabit\(selected\.planItemId\)/);
  assert.doesNotMatch(activity, /key: 'yoga'/);
});

test('assigned count avoids duplicate meals and the Log count stays compact', async () => {
  const [dashboard, log] = await Promise.all([
    source('../src/screens/user/DashboardScreen.jsx'),
    source('../src/screens/user/MealsScreen.jsx'),
  ]);
  assert.match(dashboard, /meals\.items\.length \+ plan\.tasks\.filter\(\(task\) => task\.type === 'HEALTHY_HABIT'\)\.length/);
  assert.match(log, /count: \{[^}]*fontSize: 15/);
  assert.doesNotMatch(log, /count: \{[^}]*fontSize: 29/);
});

test('shared member profile uses admin attention cards with a shared thirty minute cooldown', async () => {
  const [profile, list, api, card] = await Promise.all([
    source('../src/screens/user/SharedMemberTodayScreen.jsx'),
    source('../src/screens/user/SharedMembersScreen.jsx'),
    source('../src/services/api/memberAccessApi.js'),
    source('../src/components/common/MemberAttentionCard.jsx'),
  ]);
  assert.match(profile, /\['Today', 'Nudges', 'History', 'Reports'\]/);
  assert.match(card, /Available in \$\{minutes\} min/);
  assert.match(profile, /locked for every admin and coach for 30 minutes/);
  assert.match(profile, /memberName=\{memberName\}/);
  assert.match(profile, /MemberAttentionCard/);
  assert.match(api, /attention\/\$\{attentionId\}\/nudge/);
  assert.doesNotMatch(list, /Send nudge/);
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
  assert.match(app, /main_theme_alert\.wav/);
});

test('member cards show today completion and Z-Drink uses its own mark', async () => {
  const [members, adminPlan, coachPlan] = await Promise.all([
    source('../src/screens/admin/AdminMembersScreen.jsx'),
    source('../src/screens/admin/UserDetailsScreen.jsx'),
    source('../src/screens/user/SharedPlanEditorScreen.jsx'),
  ]);
  assert.match(members, /member\.todayCompletion \?\? member\.adherence/);
  assert.match(members, /TODAY'S COMPLETION/);
  assert.match(adminPlan, /zDrinkIconText}>Z</);
  assert.match(coachPlan, /modeIconText}>Z</);
  assert.doesNotMatch(adminPlan, /name="flask-outline"/);
  assert.doesNotMatch(coachPlan, /name="flask-outline"/);
});
