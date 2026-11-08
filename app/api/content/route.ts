import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { updateFamily } from '@/lib/store';
import type { ContentRecord, NewsCategory } from '@/lib/types';

export const runtime = 'nodejs';

class InputError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const fail = (error: unknown) =>
  NextResponse.json(
    { error: error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.' },
    { status: error instanceof InputError ? error.status : 500 }
  );

function normalize(body: Partial<ContentRecord>, existing?: ContentRecord): ContentRecord {
  const images = Array.isArray(body.images)
    ? body.images.map(x => String(x || '').trim()).filter(Boolean)
    : existing?.images || (body.fileUrl ? [String(body.fileUrl).trim()] : []);

  const fileUrl = String(body.fileUrl || images[0] || existing?.fileUrl || '').trim();

  const validCategories: NewsCategory[] = ['gio', 'le', 'tiec', 'khac'];
  const category = body.category && validCategories.includes(body.category as NewsCategory)
    ? (body.category as NewsCategory)
    : (existing?.category || 'khac');

  return {
    id: existing?.id || crypto.randomUUID(),
    kind: existing?.kind || (body.kind === 'document' ? 'document' : 'event'),
    category,
    title: String(body.title || existing?.title || '').trim(),
    description: String(body.description || existing?.description || '').trim(),
    date: String(body.date || existing?.date || new Date().toISOString().slice(0, 10)),
    location: String(body.location || existing?.location || '').trim(),
    author: String(body.author || existing?.author || '').trim(),
    fileUrl,
    images,
    createdAt: existing?.createdAt || new Date().toISOString()
  };
}

function validate(record: ContentRecord) {
  if (!record.title) throw new InputError('Vui lòng nhập tiêu đề bài viết.');
  if (record.kind === 'event' && !record.date) throw new InputError('Vui lòng chọn ngày diễn ra.');
  if (record.fileUrl && !record.fileUrl.startsWith('/api/files/') && !record.fileUrl.startsWith('http')) {
    throw new InputError('Tệp đính kèm không hợp lệ.');
  }
  if (record.images && record.images.length > 30) {
    throw new InputError('Mỗi bài viết tối đa 30 hình ảnh.');
  }
  if (record.images) {
    for (const url of record.images) {
      if (url && !url.startsWith('/api/files/') && !url.startsWith('http')) {
        throw new InputError('Đường dẫn hình ảnh không hợp lệ.');
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data } = await updateFamily(data => {
      const record = normalize(body);
      validate(record);
      data.content = [record, ...(data.content || [])];
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị để chỉnh sửa nội dung.' }, { status: 401 });
  try {
    const body = await request.json();
    const { data } = await updateFamily(data => {
      const old = data.content.find(item => item.id === body.id);
      if (!old) throw new InputError('Không tìm thấy nội dung.', 404);
      const record = normalize(body, old);
      validate(record);
      data.content = data.content.map(item => item.id === old.id ? record : item);
    });
    return NextResponse.json(data);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị để xóa nội dung.' }, { status: 401 });
  try {
    const { id } = await request.json();
    const { data } = await updateFamily(data => {
      if (!data.content.some(item => item.id === id)) throw new InputError('Không tìm thấy nội dung.', 404);
      data.content = data.content.filter(item => item.id !== id);
    });
    return NextResponse.json(data);
  } catch (error) {
    return fail(error);
  }
}
