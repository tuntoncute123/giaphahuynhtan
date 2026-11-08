import type { Member } from './types';
import { normalizeLocation, locationError } from './location';
import { normalizeAnniversary } from './lunar';

export const displayYear = (date: string) => date ? date.slice(0, 4) : '—';
export const fullDate = (date: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN') : 'Chưa cập nhật';
export const byName = (a: Member, b: Member) => a.fullName.localeCompare(b.fullName, 'vi');
export const normalizeSearch = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').trim();
export function matchesMember(person: Member, query: string) {
  const needle = normalizeSearch(query);
  return !needle || [person.fullName, ...person.aliases].some(value => normalizeSearch(value).includes(needle));
}
export function normalizeZaloPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (/^0[35789]\d{8}$/.test(digits)) return `84${digits.slice(1)}`;
  if (/^84[35789]\d{8}$/.test(digits)) return digits;
  return value.trim();
}

export function generationOf(id: string, members: Member[], visiting = new Set<string>()): number {
  if (visiting.has(id)) return 1;
  const person = members.find(m => m.id === id);
  if (!person) return 1;
  const next = new Set(visiting).add(id);
  const parents = [person.fatherId, person.motherId].filter((x): x is string => !!x && members.some(m => m.id === x));
  if (parents.length) return 1 + Math.max(...parents.map(p => generationOf(p, members, next)));
  const spouse = person.spouseIds.map(s => members.find(m => m.id === s)).find(s => s && (s.fatherId || s.motherId));
  if (spouse) return generationOf(spouse.id, members, next);
  return 1;
}

export function childrenOf(id: string, members: Member[]): Member[] {
  return members.filter(m => m.fatherId === id || m.motherId === id).sort(byName);
}
export function siblingsOf(person: Member, members: Member[]): Member[] {
  if (!person.fatherId && !person.motherId) return [];
  return members.filter(m => m.id !== person.id && ((person.fatherId && m.fatherId === person.fatherId) || (person.motherId && m.motherId === person.motherId))).sort(byName);
}
export function descendantsOf(id: string, members: Member[], visited = new Set<string>()): Member[] {
  if (visited.has(id)) return [];
  visited.add(id);
  const direct = childrenOf(id, members);
  return [...direct, ...direct.flatMap(child => descendantsOf(child.id, members, visited))];
}
export function relationshipBetween(firstId: string, secondId: string, members: Member[]): string {
  const first = members.find(m => m.id === firstId); const second = members.find(m => m.id === secondId);
  if (!first || !second) return 'Chọn hai thành viên để tra cứu mối quan hệ.';
  if (first.id === second.id) return 'Bạn đang chọn cùng một thành viên.';
  if (first.spouseIds.includes(second.id) || second.spouseIds.includes(first.id)) return `${first.fullName} là người phối ngẫu của ${second.fullName}.`;
  const ancestors = (id: string) => {
    const depths = new Map<string, number>(); const queue: [string, number][] = [[id, 0]];
    while (queue.length) {
      const [current, depth] = queue.shift()!;
      if (depths.has(current)) continue;
      depths.set(current, depth);
      const person = members.find(m => m.id === current);
      if (person) for (const parent of [person.fatherId, person.motherId]) if (parent) queue.push([parent, depth + 1]);
    }
    return depths;
  };
  const a = ancestors(first.id); const b = ancestors(second.id);
  const aToB = b.get(first.id); const bToA = a.get(second.id);
  if (aToB) return `${first.fullName} là ${aToB === 1 ? first.gender === 'Nữ' ? 'mẹ' : 'cha' : aToB === 2 ? 'ông/bà' : 'tổ tiên'} của ${second.fullName}.`;
  if (bToA) return `${first.fullName} là ${bToA === 1 ? 'con' : bToA === 2 ? 'cháu' : 'hậu duệ'} của ${second.fullName}.`;
  const common = [...a.entries()].filter(([id]) => b.has(id)).sort((x, y) => x[1] + b.get(x[0])! - y[1] - b.get(y[0])!)[0];
  if (!common) return 'Chưa tìm thấy mối quan hệ huyết thống trong dữ liệu hiện có.';
  const da = common[1]; const db = b.get(common[0])!;
  if (da === 1 && db === 1) return `${first.fullName} và ${second.fullName} là anh chị em.`;
  if (da === 1 && db === 2) return `${first.fullName} là cô/chú/bác của ${second.fullName}.`;
  if (da === 2 && db === 1) return `${first.fullName} là cháu của ${second.fullName}.`;
  if (da === db) return `${first.fullName} và ${second.fullName} là anh chị em họ.`;
  return `${first.fullName} và ${second.fullName} có chung tổ tiên trong cây gia phả.`;
}
export function normalizeMember(input: Partial<Member>): Member {
  const rawOrder = (input as { birthOrder?: unknown }).birthOrder;
  return {
    id: typeof input.id === 'string' ? input.id : crypto.randomUUID(),
    fullName: String(input.fullName || '').trim(),
    aliases: Array.isArray(input.aliases) ? [...new Set(input.aliases.map(value => String(value).trim()).filter(Boolean))] : [],
    birthOrder: rawOrder === null || rawOrder === undefined || rawOrder === '' ? null : Number(rawOrder),
    gender: input.gender === 'Nữ' || input.gender === 'Khác' ? input.gender : 'Nam',
    birthDate: String(input.birthDate || ''), deathDate: String(input.deathDate || ''),
    anniversary: normalizeAnniversary(input.anniversary),
    birthPlace: String(input.birthPlace || '').trim(), currentPlace: String(input.currentPlace || '').trim(),
    home: normalizeLocation(input.home), homePublic: input.homePublic === true,
    zaloPhone: normalizeZaloPhone(String(input.zaloPhone || '')), zaloConsent: input.zaloConsent === true,
    occupation: String(input.occupation || '').trim(), biography: String(input.biography || '').trim(),
    fatherId: input.fatherId || null, motherId: input.motherId || null,
    spouseIds: Array.isArray(input.spouseIds) ? [...new Set(input.spouseIds.filter((s): s is string => typeof s === 'string'))] : [],
    avatar: String(input.avatar || ''), createdAt: input.createdAt || new Date().toISOString()
  };
}
export function validateMember(person: Member, members: Member[]): string | null {
  if (!person.fullName) return 'Vui lòng nhập họ và tên.';
  if (person.birthOrder !== null && (!Number.isInteger(person.birthOrder) || person.birthOrder < 1 || person.birthOrder > 30)) return 'Thứ tự trong gia đình phải từ 1 đến 30.';
  if (person.aliases.length > 12 || person.aliases.some(alias => alias.length > 80)) return 'Tối đa 12 biệt danh, mỗi biệt danh dài tối đa 80 ký tự.';
  if (person.deathDate && person.birthDate && person.deathDate < person.birthDate) return 'Ngày mất không thể trước ngày sinh.';
  if (locationError(person.home)) return locationError(person.home);
  if (person.zaloPhone && !/^84[35789]\d{8}$/.test(person.zaloPhone)) return 'Số Zalo cần là số di động Việt Nam hợp lệ.';
  if (person.zaloConsent && !person.zaloPhone) return 'Cần nhập số Zalo trước khi bật đồng ý nhận nhắc giỗ.';
  const ids = [person.fatherId, person.motherId, ...person.spouseIds].filter(Boolean) as string[];
  if (ids.includes(person.id)) return 'Một thành viên không thể có quan hệ với chính mình.';
  if (person.fatherId && person.fatherId === person.motherId) return 'Cha và mẹ phải là hai người khác nhau.';
  if (ids.some(id => !members.some(m => m.id === id))) return 'Có quan hệ trỏ đến thành viên không tồn tại.';
  if ([person.fatherId, person.motherId].some(id => id && descendantsOf(person.id, members).some(d => d.id === id))) return 'Quan hệ cha mẹ tạo thành vòng lặp.';
  return null;
}
