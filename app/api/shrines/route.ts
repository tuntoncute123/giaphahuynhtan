import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { locationError, mapUrl, normalizeLocation } from '@/lib/location';
import { normalizeAnniversary } from '@/lib/lunar';
import { updateFamily } from '@/lib/store';
import type { Shrine } from '@/lib/types';

export const runtime = 'nodejs';
class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
const fail = (error: unknown) => NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.' }, { status: error instanceof InputError ? error.status : 500 });
function normalize(body: Partial<Shrine>, old?: Shrine): Shrine {
  return { id: old?.id || crypto.randomUUID(), name: String(body.name || '').trim(), description: String(body.description || '').trim(), location: normalizeLocation(body.location), caretakerId: body.caretakerId || null, ceremony: normalizeAnniversary(body.ceremony), createdAt: old?.createdAt || new Date().toISOString() };
}
function validate(shrine: Shrine, memberIds: string[]) {
  if (!shrine.name) throw new InputError('Vui lòng nhập tên nhà thờ.');
  const error = locationError(shrine.location); if (error) throw new InputError(error);
  if (!mapUrl(shrine.location)) throw new InputError('Vui lòng nhập địa chỉ hoặc tọa độ nhà thờ.');
  if (shrine.caretakerId && !memberIds.includes(shrine.caretakerId)) throw new InputError('Người phụ trách không có trong gia phả.');
}
export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try { const body = await request.json(); const { data } = await updateFamily(data => { const shrine = normalize(body); validate(shrine, data.members.map(m => m.id)); data.shrines.push(shrine); }); return NextResponse.json(data, { status: 201 }); }
  catch (error) { return fail(error); }
}
export async function PUT(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try { const body = await request.json(); const { data } = await updateFamily(data => { const old = data.shrines.find(s => s.id === body.id); if (!old) throw new InputError('Không tìm thấy nhà thờ.', 404); const shrine = normalize(body, old); validate(shrine, data.members.map(m => m.id)); data.shrines = data.shrines.map(s => s.id === old.id ? shrine : s); }); return NextResponse.json(data); }
  catch (error) { return fail(error); }
}
export async function DELETE(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try { const { id } = await request.json(); const { data } = await updateFamily(data => { if (!data.shrines.some(s => s.id === id)) throw new InputError('Không tìm thấy nhà thờ.', 404); data.shrines = data.shrines.filter(s => s.id !== id); data.reminders = data.reminders.filter(r => r.eventKey !== `shrine:${id}`); }); return NextResponse.json(data); }
  catch (error) { return fail(error); }
}
