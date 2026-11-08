import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  const form = await request.formData(); const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Chưa chọn tệp.' }, { status: 400 });
  const allowed: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
  const extension = allowed[file.type];
  if (!extension || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Chỉ nhận JPG, PNG, WebP hoặc PDF tối đa 5 MB.' }, { status: 400 });
  const directory = path.join(process.cwd(), 'public', 'uploads'); await mkdir(directory, { recursive: true });
  const filename = `${crypto.randomUUID()}${extension}`; await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ fileUrl: `/api/files/${filename}` });
}
