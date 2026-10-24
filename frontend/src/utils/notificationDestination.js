export function notificationDestination(role, kind, data = {}) {
  if (role === 'ADMIN') {
    return { name: 'AdminTabs', params: { screen: ({ SIGNUP: 'UserRequests', DEADLINE: 'Alerts', DIGEST: 'AdminDashboard',
      MEAL_POST: 'UserList', ACTIVITY: 'UserList' })[kind] || 'NotificationSettings' } };
  }
  if (kind === 'ACCESS') return { name: 'Shared', params: { screen: 'SharedMembers' } };
  const mealId = data.targetId || String(data.sourceKey || '').match(/^meal-(\d+)/)?.[1];
  if (kind === 'MEAL' && mealId) return { name: 'Log', params: { screen: 'MealCapture', params: { category: 'meal', targetMealId: Number(mealId) } } };
  if (['PLAN', 'MEAL', 'HABIT', 'NUDGE', 'DEADLINE'].includes(kind)) return { name: 'Log', params: { screen: 'TodayTimeline' } };
  return { name: 'Profile', params: { screen: 'ProfileHome' } };
}
