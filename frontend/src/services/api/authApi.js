import { appendImage } from './imageUpload';
import { request } from './client';
export const login = (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const googleLogin = (idToken) => request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) });
export const requestPasswordReset = (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
export const resetPassword = (email, otp, newPassword) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) });

const registrationDetails = (profile, extra = {}) => {
  const number = (value) => value === '' || value == null ? null : Number(value);
  return {
    ...extra,
    name: profile.name, email: profile.email, password: profile.password,
    age: number(profile.age), heightCm: number(profile.height), weightKg: number(profile.weight),
    goal: profile.goal || null, notes: profile.notes || null,
  };
};

async function submitRegistration(path, details, photo) {
  if (!photo?.uri) return request(path, { method: 'POST', body: JSON.stringify(details) });
  const form = new FormData();
  form.append('profile', JSON.stringify(details));
  await appendImage(form, photo);
  return request(path, { method: 'POST', body: form });
}

export function register(profile) {
  return submitRegistration('/auth/register', registrationDetails(profile), profile.photo);
}

export function registerWithGoogle(profile, idToken) {
  const allDetails = registrationDetails(profile, { idToken });
  const details = {
    idToken: allDetails.idToken, age: allDetails.age, heightCm: allDetails.heightCm,
    weightKg: allDetails.weightKg, goal: allDetails.goal, notes: allDetails.notes,
  };
  return submitRegistration('/auth/google/register', details, profile.photo);
}
