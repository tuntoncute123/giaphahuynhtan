import { NextResponse } from 'next/server';
import { recordRevision, replaceMember } from '@/lib/community/revisions';
import { communityOf } from '@/lib/community/model';
import { CommunityError } from '@/lib/community/validation';
import { normalizeMember, validateMember } from '@/lib/family';
import { isAdmin } from '@/lib/auth';
import { publicFamily, readFamily, updateFamily } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
const fail = (error: unknown) => NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.' }, { status: (error instanceof InputError || error instanceof CommunityError) ? error.status : 500 });
export async function GET(request: Request) {
  try { return NextResponse.json(publicFamily(await readFamily(), isAdmin(request)), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try {
    const raw = await request.json();
    const { data } = await updateFamily(data => {
      const person = normalizeMember({ ...raw, id: crypto.randomUUID() });
      const error = validateMember(person, data.members); if (error) throw new InputError(error);
      data.members.push(person);
      for (const spouseId of person.spouseIds) { const spouse = data.members.find(m => m.id === spouseId)!; spouse.spouseIds = [...new Set([...spouse.spouseIds, person.id])]; }
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return fail(error); }
}
export async function PUT(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try {
    const raw = await request.json();
    const { data } = await updateFamily(data => {
      const original = data.members.find(m => m.id === raw.id); if (!original) throw new InputError('Không tìm thấy thành viên.', 404);
      const person = normalizeMember({ ...original, ...raw });
      const error = validateMember(person, data.members); if (error) throw new InputError(error);
      replaceMember(data, person);
      recordRevision(data, original, person, 'Quản trị chỉnh sửa hồ sơ');
    });
    return NextResponse.json(data);
  } catch (error) { return fail(error); }
}
export async function DELETE(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  try {
    const { id } = await request.json();
    const { data } = await updateFamily(data => {
      if (!data.members.some(m => m.id === id)) throw new InputError('Không tìm thấy thành viên.', 404);
      data.members = data.members.filter(m => m.id !== id).map(m => ({ ...m, fatherId: m.fatherId === id ? null : m.fatherId, motherId: m.motherId === id ? null : m.motherId, spouseIds: m.spouseIds.filter(s => s !== id) }));
      const community = data.community = communityOf(data);
      community.photos = community.photos.map(p => ({ ...p, tags: p.tags.filter(t => t.memberId !== id) }));
      community.memories = community.memories.map(m => ({ ...m, memberIds: m.memberIds.filter(memberId => memberId !== id) }));
      community.tasks = community.tasks.map(t => t.assigneeId === id ? { ...t, assigneeId: '' } : t);
      community.sources = community.sources.filter(s => s.memberId !== id);
      community.graves = community.graves.filter(g => g.memberId !== id);
      community.contributions = community.contributions.map(c => c.memberId === id && c.status === 'pending' ? { ...c, status: 'rejected', reviewNote: 'Hồ sơ đã bị xóa.', reviewedAt: new Date().toISOString() } : c);
      data.shrines = data.shrines.map(s => s.caretakerId === id ? { ...s, caretakerId: null } : s);
      data.reminders = data.reminders.filter(r => r.recipientId !== id && r.eventKey !== `person:${id}`);
    });
    return NextResponse.json(data);
  } catch (error) { return fail(error); }
}
