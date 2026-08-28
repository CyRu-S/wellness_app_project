import { request } from './client';
export const login = (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const register = (profile) => request('/auth/register', { method: 'POST', body: JSON.stringify(profile) });
export const googleLogin = (idToken) => request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) });
