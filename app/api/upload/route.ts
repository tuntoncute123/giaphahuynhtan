import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isAdmin } from '@/lib/auth';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  const form = await request.formData(); const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Chưa chọn tệp.' }, { status: 400 });
  const allowed: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
  const extension = allowed[file.type];
  if (!extension || file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Chỉ nhận JPG, PNG, WebP hoặc PDF tối đa 4 MB.' }, { status: 400 });
  const filename = `${crypto.randomUUID()}${extension}`;
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await put(`uploads/${filename}`, file, { access: 'private', contentType: file.type });
    } else {
      if (process.env.VERCEL) return NextResponse.json({ error: 'Chưa cấu hình BLOB_READ_WRITE_TOKEN trên Vercel.' }, { status: 503 });
      const directory = path.join(process.cwd(), 'public', 'uploads'); await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
    }
  } catch (error) {
    console.error('Không tải được tệp lên kho lưu trữ:', error);
    return NextResponse.json({ error: 'Không tải được tệp lên kho lưu trữ. Vui lòng kiểm tra cấu hình Vercel Blob.' }, { status: 500 });
  }
  return NextResponse.json({ fileUrl: `/api/files/${filename}` });
}
