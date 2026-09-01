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

export const getSharedMemberToday = (token, memberId) => request(`/shared-members/${memberId}/today`, {
  headers: authHeaders(token),
});

