import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isAdmin } from '@/lib/auth';
import { put } from '@vercel/blob';
import { hasBlobCredentials } from '@/lib/blob';
import { useDatabase, database, ensureDatabase } from '@/lib/database';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Chưa chọn tệp.' }, { status: 400 });
  }

  const allowed: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf'
  };
  const extension = allowed[file.type];
  if (!extension) {
    return NextResponse.json({ error: 'Chỉ nhận hình ảnh (JPG, PNG, WebP) hoặc tệp PDF.' }, { status: 400 });
  }
  if (extension === '.pdf' && !isAdmin(request)) {
    return NextResponse.json({ error: 'Chỉ ban quản trị mới có thể tải lên tệp PDF.' }, { status: 401 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Kích thước tệp tối đa là 10 MB.' }, { status: 400 });
  }

  const filename = `${crypto.randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (hasBlobCredentials()) {
      await put(`uploads/${filename}`, file, { access: 'private', contentType: file.type });
    } else if (useDatabase()) {
      await ensureDatabase();
      const db = database();
      await db`INSERT INTO app_files (filename, content_type, data) VALUES (${filename}, ${file.type}, ${buffer})`;
    } else {
      const directory = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, filename), buffer);
    }
  } catch (error) {
    console.error('Không tải được tệp lên kho lưu trữ:', error);
    return NextResponse.json({ error: 'Không tải được tệp lên kho lưu trữ.' }, { status: 500 });
  }

  return NextResponse.json({ fileUrl: `/api/files/${filename}` });
}
