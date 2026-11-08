import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { updateFamily } from '@/lib/store';
import type { ContentRecord } from '@/lib/types';

export const runtime = 'nodejs';
class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
const fail = (error: unknown) => NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.' }, { status: error instanceof InputError ? error.status : 500 });
function normalize(body: Partial<ContentRecord>, existing?: ContentRecord): ContentRecord {
  return { id: existing?.id || crypto.randomUUID(), kind: existing?.kind || (body.kind === 'event' ? 'event' : 'document'), title: String(body.title || '').trim(), description: String(body.description || '').trim(), date: String(body.date || ''), location: String(body.location || '').trim(), fileUrl: String(body.fileUrl || ''), createdAt: existing?.createdAt || new Date().toISOString() };
}
function validate(record: ContentRecord) {
  if (!record.title) throw new InputError('Vui lòng nhập tiêu đề.');
  if (record.kind === 'event' && !record.date) throw new InputError('Vui lòng chọn ngày sự kiện.');
  if (record.fileUrl && !record.fileUrl.startsWith('/api/files/')) throw new InputError('Tệp đính kèm không hợp lệ.');
}
export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try { const body = await request.json(); const { data } = await updateFamily(data => { const record = normalize(body); validate(record); data.content.push(record); }); return NextResponse.json(data, { status: 201 }); }
  catch (error) { return fail(error); }
}
export async function PUT(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try { const body = await request.json(); const { data } = await updateFamily(data => { const old = data.content.find(item => item.id === body.id); if (!old) throw new InputError('Không tìm thấy nội dung.', 404); const record = normalize(body, old); validate(record); data.content = data.content.map(item => item.id === old.id ? record : item); }); return NextResponse.json(data); }
  catch (error) { return fail(error); }
}
export async function DELETE(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try { const { id } = await request.json(); const { data } = await updateFamily(data => { if (!data.content.some(item => item.id === id)) throw new InputError('Không tìm thấy nội dung.', 404); data.content = data.content.filter(item => item.id !== id); }); return NextResponse.json(data); }
  catch (error) { return fail(error); }
}
