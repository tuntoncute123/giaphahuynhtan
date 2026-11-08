import postgres from 'postgres';

let client: ReturnType<typeof postgres> | null = null;
let initialized: Promise<void> | null = null;

export function useDatabase() {
  if (process.env.DATABASE_URL) return true;
  if (process.env.VERCEL) throw new Error('Chưa cấu hình DATABASE_URL cho dự án trên Vercel.');
  return false;
}

export function database() {
  if (!process.env.DATABASE_URL) throw new Error('Chưa cấu hình DATABASE_URL.');
  client ??= postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false });
  return client;
}

export async function ensureDatabase() {
  if (!initialized) {
    initialized = database()`CREATE TABLE IF NOT EXISTS app_state (
      key text PRIMARY KEY,
      data jsonb NOT NULL
    )`.then(() => undefined).catch(error => { initialized = null; throw error; });
  }
  await initialized;
}
