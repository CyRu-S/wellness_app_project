import { appendImage } from './imageUpload';
import { request } from './client';
export const login = (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const googleLogin = (idToken) => request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) });
export async function register(profile) {
  const number = (value) => value === '' || value == null ? null : Number(value);
  const details = {
    name: profile.name, email: profile.email, password: profile.password,
    age: number(profile.age), heightCm: number(profile.height), weightKg: number(profile.weight),
    goal: profile.goal || null, notes: profile.notes || null,
  };
  if (!profile.photo?.uri) return request('/auth/register', { method: 'POST', body: JSON.stringify(details) });
  const form = new FormData();
  form.append('profile', JSON.stringify(details));
  await appendImage(form, profile.photo);
  return request('/auth/register', { method: 'POST', body: form });
}
