import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { get } from '@vercel/blob';
import { hasBlobCredentials } from '@/lib/blob';
import { useDatabase, database, ensureDatabase } from '@/lib/database';

export const runtime = 'nodejs';

const mime: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(filename)) {
    return new Response('Tệp không hợp lệ.', { status: 400 });
  }

  // 1. Try Vercel Blob if credentials exist
  if (hasBlobCredentials()) {
    try {
      const result = await get(`uploads/${filename}`, { access: 'private' });
      if (result && result.statusCode === 200) {
        return new Response(result.stream, {
          headers: {
            'Content-Type': result.blob.contentType || mime[path.extname(filename)],
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      }
    } catch {
      // Fall through to DB or local
    }
  }

  // 2. Try PostgreSQL app_files
  if (useDatabase()) {
    try {
      await ensureDatabase();
      const db = database();
      const rows = await db`SELECT content_type, data FROM app_files WHERE filename = ${filename}`;
      if (rows.length > 0) {
        return new Response(rows[0].data, {
          headers: {
            'Content-Type': rows[0].content_type || mime[path.extname(filename)],
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      }
    } catch (dbErr) {
      console.error('Lỗi đọc tệp từ database:', dbErr);
    }
  }

  // 3. Try local filesystem
  try {
    const extension = path.extname(filename);
    const file = await readFile(path.join(process.cwd(), 'public', 'uploads', filename));
    return new Response(file, {
      headers: {
        'Content-Type': mime[extension],
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Response('Không tìm thấy tệp.', { status: 404 });
    }
    throw error;
  }
}
