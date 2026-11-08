import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { get } from '@vercel/blob';

export const runtime = 'nodejs';
const mime: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' };
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(filename)) return new Response('Tệp không hợp lệ.', { status: 400 });
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await get(`uploads/${filename}`, { access: 'private' });
    if (!result || result.statusCode !== 200) return new Response('Không tìm thấy tệp.', { status: 404 });
    return new Response(result.stream, { headers: { 'Content-Type': result.blob.contentType || mime[path.extname(filename)], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (process.env.VERCEL) return new Response('Chưa cấu hình BLOB_READ_WRITE_TOKEN.', { status: 503 });
  try {
    const extension = path.extname(filename);
    const file = await readFile(path.join(process.cwd(), 'public', 'uploads', filename));
    return new Response(file, { headers: { 'Content-Type': mime[extension], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Response('Không tìm thấy tệp.', { status: 404 });
    throw error;
  }
}
