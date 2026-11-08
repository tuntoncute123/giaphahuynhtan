import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { MemorialEvent } from './lunar';
import type { Member, ReminderSubscription } from './types';
import { database, ensureDatabase, useDatabase } from './database';

type TokenFile = { accessToken: string; refreshToken: string; expiresAt: number };
type TemplateField = 'recipient' | 'event' | 'lunarDate' | 'solarDate' | 'location' | 'daysBefore';
const tokenPath = path.join(process.cwd(), 'data', 'zalo-tokens.json');
const fields: TemplateField[] = ['recipient', 'event', 'lunarDate', 'solarDate', 'location', 'daysBefore'];
function templateMap(): Partial<Record<TemplateField, string>> {
  try {
    const raw = JSON.parse(process.env.ZALO_TEMPLATE_DATA_MAP || '{}') as Record<string, unknown>;
    return Object.fromEntries(fields.filter(key => typeof raw[key] === 'string' && raw[key]).map(key => [key, raw[key]]));
  } catch { return {}; }
}
export function zaloConfigStatus() {
  const missing: string[] = [];
  for (const key of ['CRON_SECRET', 'ZALO_APP_ID', 'ZALO_APP_SECRET', 'ZALO_TEMPLATE_ID', 'ZALO_REFRESH_TOKEN']) if (!process.env[key]) missing.push(key);
  if (!Object.keys(templateMap()).length) missing.push('ZALO_TEMPLATE_DATA_MAP');
  return { ready: missing.length === 0, missing };
}
async function readTokens(): Promise<TokenFile | null> {
  if (useDatabase()) {
    await ensureDatabase();
    const rows = await database()`SELECT data FROM app_state WHERE key = 'zalo_tokens'`;
    return rows.length ? rows[0].data as TokenFile : null;
  }
  try { return JSON.parse(await readFile(tokenPath, 'utf8')) as TokenFile; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
async function writeTokens(tokens: TokenFile) {
  if (useDatabase()) {
    await ensureDatabase();
    await database()`INSERT INTO app_state (key, data) VALUES ('zalo_tokens', ${JSON.stringify(tokens)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`;
    return;
  }
  await mkdir(path.dirname(tokenPath), { recursive: true });
  const temporary = `${tokenPath}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(tokens), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, tokenPath);
}
async function accessToken(): Promise<string> {
  const saved = await readTokens();
  if (saved?.accessToken && saved.expiresAt > Date.now() + 5 * 60 * 1000) return saved.accessToken;
  const refreshToken = saved?.refreshToken || process.env.ZALO_REFRESH_TOKEN;
  if (!refreshToken || !process.env.ZALO_APP_ID || !process.env.ZALO_APP_SECRET) throw new Error('Chưa cấu hình token Zalo.');
  const body = new URLSearchParams({ refresh_token: refreshToken, app_id: process.env.ZALO_APP_ID, grant_type: 'refresh_token' });
  const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: process.env.ZALO_APP_SECRET }, body, signal: AbortSignal.timeout(15000) });
  const result = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: string; error?: number; message?: string };
  if (!response.ok || !result.access_token || !result.refresh_token) throw new Error(`Zalo từ chối làm mới token${result.error ? ` (mã ${result.error})` : ''}.`);
  const tokens = { accessToken: result.access_token, refreshToken: result.refresh_token, expiresAt: Date.now() + Math.max(3600, Number(result.expires_in || 90000)) * 1000 };
  await writeTokens(tokens);
  return tokens.accessToken;
}
export async function sendZaloReminder(recipient: Member, event: MemorialEvent, reminder: ReminderSubscription, eventDate: string) {
  if (!zaloConfigStatus().ready) throw new Error('Zalo chưa được cấu hình.');
  const map = templateMap();
  const values: Record<TemplateField, string> = { recipient: recipient.fullName, event: event.title, lunarDate: `${event.lunar.day}/${event.lunar.month}${event.lunar.leap ? ' nhuận' : ''}`, solarDate: eventDate.split('-').reverse().join('/'), location: event.location || 'Theo thông báo của gia đình', daysBefore: String(reminder.daysBefore) };
  const templateData = Object.fromEntries(fields.filter(key => map[key]).map(key => [map[key]!, values[key]]));
  const trackingId = createHash('sha256').update(`${reminder.id}:${eventDate}`).digest('hex').slice(0, 32);
  const response = await fetch('https://business.openapi.zalo.me/message/template', { method: 'POST', headers: { 'Content-Type': 'application/json', access_token: await accessToken() }, body: JSON.stringify({ phone: recipient.zaloPhone, template_id: process.env.ZALO_TEMPLATE_ID, template_data: templateData, tracking_id: trackingId }), signal: AbortSignal.timeout(15000) });
  const result = await response.json() as { error?: number; message?: string; data?: { msg_id?: string } };
  if (!response.ok || result.error !== 0) throw new Error(`Zalo không nhận tin${result.error !== undefined ? ` (mã ${result.error})` : ''}.`);
  return result.data?.msg_id || trackingId;
}
