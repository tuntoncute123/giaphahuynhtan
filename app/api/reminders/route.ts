import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { memorialEvents } from '@/lib/lunar';
import { updateFamily } from '@/lib/store';
import type { FamilyData, ReminderSubscription } from '@/lib/types';

export const runtime = 'nodejs';
class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
const fail = (error: unknown) => NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.' }, { status: error instanceof InputError ? error.status : 500 });
function normalize(body: Partial<ReminderSubscription>, old?: ReminderSubscription): ReminderSubscription {
  return { id: old?.id || crypto.randomUUID(), recipientId: String(body.recipientId || ''), eventKey: String(body.eventKey || ''), daysBefore: Number(body.daysBefore ?? 0), enabled: body.enabled !== false, createdAt: old?.createdAt || new Date().toISOString() };
}
function validate(reminder: ReminderSubscription, data: FamilyData) {
  const recipient = data.members.find(m => m.id === reminder.recipientId);
  if (!recipient) throw new InputError('Chọn người nhận có trong gia phả.');
  if (!recipient.zaloPhone || !recipient.zaloConsent) throw new InputError('Người nhận cần có số Zalo và đồng ý nhận nhắc giỗ.');
  if (!memorialEvents(data.members, data.shrines).some(event => event.key === reminder.eventKey)) throw new InputError('Ngày giỗ không tồn tại hoặc chưa có ngày âm lịch.');
  if (!Number.isInteger(reminder.daysBefore) || reminder.daysBefore < 0 || reminder.daysBefore > 30) throw new InputError('Số ngày nhắc trước phải từ 0 đến 30.');
  if (data.reminders.some(r => r.id !== reminder.id && r.recipientId === reminder.recipientId && r.eventKey === reminder.eventKey && r.daysBefore === reminder.daysBefore)) throw new InputError('Người này đã có lịch nhắc trùng ngày.');
}
export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try { const body = await request.json(); const { data } = await updateFamily(data => { const reminder = normalize(body); validate(reminder, data); data.reminders.push(reminder); }); return NextResponse.json(data, { status: 201 }); }
  catch (error) { return fail(error); }
}
export async function PUT(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try { const body = await request.json(); const { data } = await updateFamily(data => { const old = data.reminders.find(r => r.id === body.id); if (!old) throw new InputError('Không tìm thấy lịch nhắc.', 404); const reminder = normalize({ ...old, ...body }, old); validate(reminder, data); data.reminders = data.reminders.map(r => r.id === old.id ? reminder : r); }); return NextResponse.json(data); }
  catch (error) { return fail(error); }
}
export async function DELETE(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try { const { id } = await request.json(); const { data } = await updateFamily(data => { if (!data.reminders.some(r => r.id === id)) throw new InputError('Không tìm thấy lịch nhắc.', 404); data.reminders = data.reminders.filter(r => r.id !== id); }); return NextResponse.json(data); }
  catch (error) { return fail(error); }
}
