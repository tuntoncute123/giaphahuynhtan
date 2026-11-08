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
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n');
  client ??= postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {})
  });
  return client;
}

export async function ensureDatabase() {
  if (!initialized) {
    initialized = (async () => {
      const db = database();
      await db`CREATE TABLE IF NOT EXISTS app_state (
        key text PRIMARY KEY,
        data jsonb NOT NULL
      )`;
      await db`CREATE TABLE IF NOT EXISTS app_files (
        filename text PRIMARY KEY,
        content_type text NOT NULL,
        data bytea NOT NULL,
        created_at timestamptz DEFAULT now()
      )`;
    })().then(() => undefined).catch(error => { initialized = null; throw error; });
  }
  await initialized;
}
