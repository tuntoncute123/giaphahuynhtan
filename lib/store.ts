import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { seedData } from './seed';
import { normalizeMember } from './family';
import { normalizeLocation } from './location';
import { normalizeAnniversary } from './lunar';
import type { FamilyData, Shrine } from './types';
import { database, ensureDatabase, useDatabase } from './database';

const file = path.join(process.cwd(), 'data', 'family.json');
let previousWrite: Promise<unknown> = Promise.resolve();
export async function readFamily(): Promise<FamilyData> {
  let raw: FamilyData;
  if (useDatabase()) {
    await ensureDatabase();
    const rows = await database()`SELECT data FROM app_state WHERE key = 'family'`;
    raw = rows.length ? rows[0].data as FamilyData : structuredClone(seedData);
  } else {
    try { raw = JSON.parse(await readFile(file, 'utf8')) as FamilyData; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') raw = structuredClone(seedData); else throw error; }
  }
  return normalizeFamily(raw);
}
function normalizeFamily(raw: FamilyData): FamilyData {
  return {
    ...raw,
    members: (raw.members || []).map(normalizeMember),
    shrines: (raw.shrines || []).map((item): Shrine => ({ ...item, name: String(item.name || ''), description: String(item.description || ''), location: normalizeLocation(item.location), caretakerId: item.caretakerId || null, ceremony: normalizeAnniversary(item.ceremony) })),
    reminders: raw.reminders || [], reminderLogs: raw.reminderLogs || [], content: raw.content || []
  };
}
export async function saveFamily(data: FamilyData) {
  if (useDatabase()) {
    await ensureDatabase();
    await database()`INSERT INTO app_state (key, data) VALUES ('family', ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`;
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2), 'utf8');
  await rename(temporary, file);
}
export async function updateFamily<T>(mutate: (data: FamilyData) => Promise<T> | T): Promise<{ data: FamilyData; result: T }> {
  if (useDatabase()) {
    await ensureDatabase();
    return database().begin(async transaction => {
      await transaction`INSERT INTO app_state (key, data) VALUES ('family', ${JSON.stringify(seedData)}::jsonb)
        ON CONFLICT (key) DO NOTHING`;
      const rows = await transaction`SELECT data FROM app_state WHERE key = 'family' FOR UPDATE`;
      const data = normalizeFamily(rows[0].data as FamilyData);
      const result = await mutate(data);
      data.updatedAt = new Date().toISOString();
      await transaction`UPDATE app_state SET data = ${JSON.stringify(data)}::jsonb WHERE key = 'family'`;
      return { data, result };
    });
  }
  let release!: () => void;
  const current = new Promise<void>(resolve => { release = resolve; });
  const wait = previousWrite;
  previousWrite = current;
  await wait;
  try {
    const data = await readFamily();
    const result = await mutate(data);
    data.updatedAt = new Date().toISOString();
    await saveFamily(data);
    return { data, result };
  } finally { release(); }
}
export function publicFamily(data: FamilyData, admin: boolean): FamilyData {
  if (admin) return data;
  return { ...data, members: data.members.map(member => ({ ...member, home: member.homePublic ? member.home : { address: '', latitude: null, longitude: null }, zaloPhone: '', zaloConsent: false })), reminders: [], reminderLogs: [] };
}
