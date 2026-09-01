import { request } from './client';
export const getAdminSummary = (token) => request('/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
export const getAdminUsers = (token) => request('/admin/users', { headers: { Authorization: `Bearer ${token}` } });
export const getAdminMemberJournal = (token, memberId) => request(`/admin/users/${memberId}/journal`, { headers: { Authorization: `Bearer ${token}` } });
export const updateAdminMemberWaterGoal = (token, memberId, waterGoalMl) => request(`/admin/users/${memberId}/water-goal`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ waterGoalMl }),
});

