import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const cookieName = 'huynh_tan_admin';
const username = () => process.env.ADMIN_USERNAME || '';
const password = () => process.env.ADMIN_PASSWORD || '';
const token = () => createHmac('sha256', password()).update(`gia-pha-huynh-tan-admin:${username()}`).digest('hex');

export function credentialsConfigured() { return username().length > 0 && password().length > 0; }
export function credentialsMatch(candidateUsername: string, candidatePassword: string) {
  if (!credentialsConfigured()) return false;
  const expectedUsername = createHash('sha256').update(username()).digest();
  const actualUsername = createHash('sha256').update(candidateUsername).digest();
  const expectedPassword = createHash('sha256').update(password()).digest();
  const actualPassword = createHash('sha256').update(candidatePassword).digest();
  return timingSafeEqual(expectedUsername, actualUsername) && timingSafeEqual(expectedPassword, actualPassword);
}
export function isAdmin(request: Request) {
  if (!credentialsConfigured()) return false;
  const raw = request.headers.get('cookie') || '';
  const found = raw.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  if (!found) return false;
  const supplied = found.slice(cookieName.length + 1);
  const expected = token();
  return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
export function adminCookie() { return { name: cookieName, value: token(), httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: 60 * 60 * 24 * 7 }; }
export function clearedCookie() { return { name: cookieName, value: '', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: 0 }; }
