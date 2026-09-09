export function notificationDestination(role, kind) {
  if (role === 'ADMIN') {
    return { name: 'AdminTabs', params: { screen: ({ SIGNUP: 'UserRequests', DEADLINE: 'Alerts', DIGEST: 'AdminDashboard',
      MEAL_POST: 'UserList', ACTIVITY: 'UserList' })[kind] || 'NotificationSettings' } };
  }
  if (kind === 'ACCESS') return { name: 'Shared', params: { screen: 'SharedMembers' } };
  if (kind === 'PLAN' || kind === 'MEAL') return { name: 'Log', params: { screen: 'TodayTimeline' } };
  return { name: 'Profile', params: { screen: 'ProfileHome' } };
}
