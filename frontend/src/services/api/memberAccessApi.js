import { request } from './client';

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

export const getAdminMemberAccess = (token) => request('/admin/member-access', {
  headers: authHeaders(token),
});

export const replaceAdminMemberAccess = (token, viewerId, memberIds) => request(`/admin/member-access/${viewerId}`, {
  method: 'PUT',
  headers: authHeaders(token),
  body: JSON.stringify({ memberIds }),
});

export const getSharedMembers = (token) => request('/shared-members', {
  headers: authHeaders(token),
});

export const getSharedMemberAttention = (token, memberId) => request(`/shared-members/${memberId}/attention`, {
  headers: authHeaders(token), cachePolicy: 'network-only',
});

export const getSharedMemberToday = async (token, memberId) => {
  const [today, nudges] = await Promise.all([
    request(`/shared-members/${memberId}/today`, { headers: authHeaders(token) }),
    getSharedMemberAttention(token, memberId),
  ]);
  return { ...today, nudges };
};

export const getSharedMemberJournal = (token, memberId) => request(`/shared-members/${memberId}/journal`, {
  headers: authHeaders(token),
});

export const nudgeSharedMember = (token, memberId, type, attentionId) => request(attentionId != null
  ? `/shared-members/${memberId}/attention/${attentionId}/nudge` : `/shared-members/${memberId}/nudges/${type}`, {
  method: 'POST', headers: authHeaders(token),
});

