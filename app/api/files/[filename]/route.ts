import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
const mime: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' };
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(filename)) return new Response('Tệp không hợp lệ.', { status: 400 });
  try {
    const extension = path.extname(filename);
    const file = await readFile(path.join(process.cwd(), 'public', 'uploads', filename));
    return new Response(file, { headers: { 'Content-Type': mime[extension], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Response('Không tìm thấy tệp.', { status: 404 });
    throw error;
  }
}
