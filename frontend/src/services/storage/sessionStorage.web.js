import { readEncryptedJson, writeEncryptedJson, removeEncryptedPrefix } from './encryptedStorage';
const SESSION_KEY = 'mr-care.session.v1';
export async function readSession() {
  const session = await readEncryptedJson(SESSION_KEY);
  return session?.token && session?.user?.id && session.user.status === 'ACTIVE' ? session : null;
}
export async function writeSession(response) {
  if (!response?.token || response.status !== 'ACTIVE') return;
  const { token, ...user } = response;
  await writeEncryptedJson(SESSION_KEY, { token, user });
}
export const clearSession = () => removeEncryptedPrefix(SESSION_KEY);
