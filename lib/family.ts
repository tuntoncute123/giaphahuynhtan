import type { Member } from './types';
import { normalizeLocation, locationError } from './location';
import { normalizeAnniversary } from './lunar';

export const displayYear = (date: string) => date ? date.slice(0, 4) : '—';
export const fullDate = (date: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN') : 'Chưa cập nhật';
export const byName = (a: Member, b: Member) => a.fullName.localeCompare(b.fullName, 'vi');
export const bySeniority = (a: Member, b: Member) => {
  if (a.birthOrder != null && b.birthOrder != null) return a.birthOrder - b.birthOrder;
  if (a.birthOrder != null) return -1;
  if (b.birthOrder != null) return 1;
  if (a.birthDate && b.birthDate) return a.birthDate.localeCompare(b.birthDate);
  return a.fullName.localeCompare(b.fullName, 'vi');
};
export const normalizeSearch = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').trim();
// Client data is replaced with a new array after each edit. Cache lookups for that
// immutable snapshot; server-side validation keeps reading the current array.
const memberIndexCache = new WeakMap<Member[], Map<string, Member>>();
const generationCache = new WeakMap<Member[], Map<string, number>>();
const childrenCache = new WeakMap<Member[], Map<string, Member[]>>();
function memberIndex(members: Member[]): Map<string, Member> | null {
  if (typeof window === 'undefined') return null;
  let index = memberIndexCache.get(members);
  if (!index) {
    index = new Map(members.map(member => [member.id, member]));
    memberIndexCache.set(members, index);
  }
  return index;
}
export function matchesMember(person: Member, query: string) {
  const needle = normalizeSearch(query);
  return !needle || [person.fullName, ...person.aliases].some(value => normalizeSearch(value).includes(needle));
}

export function hasDuplicateName(person: Member, members: Member[]): boolean {
  const norm = normalizeSearch(person.fullName);
  return members.filter(m => normalizeSearch(m.fullName) === norm).length > 1;
}

export function lineageOf(person: Member, members: Member[]): string {
  const parts: string[] = [];
  const father = person.fatherId ? members.find(m => m.id === person.fatherId) : null;
  const mother = person.motherId ? members.find(m => m.id === person.motherId) : null;

  if (father && mother) {
    parts.push(`Con ông ${father.fullName} & bà ${mother.fullName}`);
  } else if (father) {
    parts.push(`Con ông ${father.fullName}`);
  } else if (mother) {
    parts.push(`Con bà ${mother.fullName}`);
  }

  if (father && father.fatherId) {
    const grandfather = members.find(m => m.id === father.fatherId);
    if (grandfather) {
      parts.push(`cháu cụ ${grandfather.fullName}`);
    }
  }

  if (!father && !mother && person.spouseIds && person.spouseIds.length > 0) {
    const spouses = person.spouseIds
      .map(id => members.find(m => m.id === id))
      .filter((s): s is Member => !!s);
    if (spouses.length > 0) {
      const spouseTitles = spouses.map(s => `${s.gender === 'Nam' ? 'ông' : 'bà'} ${s.fullName}`).join(', ');
      parts.push(`${person.gender === 'Nữ' ? 'Vợ' : 'Chồng'} ${spouseTitles}`);
    }
  }

  if (parts.length === 0 && generationOf(person.id, members) === 1) {
    parts.push('Cụ Thủy tổ dòng họ');
  }

  return parts.join(' · ');
}
export function normalizeZaloPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (/^0[35789]\d{8}$/.test(digits)) return `84${digits.slice(1)}`;
  if (/^84[35789]\d{8}$/.test(digits)) return digits;
  return value.trim();
}

export function generationOf(id: string, members: Member[], visiting = new Set<string>()): number {
  const cache = typeof window !== 'undefined' && visiting.size === 0
    ? (generationCache.get(members) || new Map<string, number>()) : null;
  if (cache && !generationCache.has(members)) generationCache.set(members, cache);
  const cached = cache?.get(id);
  if (cached !== undefined) return cached;
  if (visiting.has(id)) return 1;
  const index = memberIndex(members);
  const person = index ? index.get(id) : members.find(m => m.id === id);
  if (!person) return 1;
  const next = new Set(visiting).add(id);
  const parents = [person.fatherId, person.motherId].filter((x): x is string => !!x && (index ? index.has(x) : members.some(m => m.id === x)));
  let result = 1;
  if (parents.length) result = 1 + Math.max(...parents.map(p => generationOf(p, members, next)));
  else {
    const spouse = person.spouseIds.map(s => index ? index.get(s) : members.find(m => m.id === s)).find(s => s && (s.fatherId || s.motherId));
    if (spouse) result = generationOf(spouse.id, members, next);
  }
  cache?.set(id, result);
  return result;
}

export function childrenOf(id: string, members: Member[]): Member[] {
  const index = memberIndex(members);
  const cached = childrenCache.get(members)?.get(id);
  if (index && cached) return cached;
  const person = index ? index.get(id) : members.find(m => m.id === id);
  if (!person) return [];
  const spouseIds = person.spouseIds || [];

  const children = members.filter(m => {
    // 1. Trực tiếp là cha hoặc mẹ của con
    if (m.fatherId === id || m.motherId === id) return true;

    // 2. Nếu người này có phối ngẫu (vợ/chồng) và người phối ngẫu là cha/mẹ của con:
    if (spouseIds.length > 0) {
      if (m.fatherId && spouseIds.includes(m.fatherId)) {
        if (!m.motherId || m.motherId === id || spouseIds.includes(m.motherId)) return true;
        const childMother = index ? index.get(m.motherId) : members.find(x => x.id === m.motherId);
        if (childMother && person.spouseIds.some(s => childMother.spouseIds.includes(s))) return true;
      }
      if (m.motherId && spouseIds.includes(m.motherId)) {
        if (!m.fatherId || m.fatherId === id || spouseIds.includes(m.fatherId)) return true;
      }
    }
    return false;
  }).sort(bySeniority);
  if (index) {
    let cache = childrenCache.get(members);
    if (!cache) { cache = new Map(); childrenCache.set(members, cache); }
    cache.set(id, children);
  }
  return children;
}
export function siblingsOf(person: Member, members: Member[]): Member[] {
  if (!person.fatherId && !person.motherId) return [];
  return members.filter(m => m.id !== person.id && ((person.fatherId && m.fatherId === person.fatherId) || (person.motherId && m.motherId === person.motherId))).sort(bySeniority);
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
  if (first.spouseIds.includes(second.id) || second.spouseIds.includes(first.id)) return `${first.fullName} là ${first.gender === 'Nữ' ? 'vợ' : 'chồng'} của ${second.fullName}.`;
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
  if (person.zaloPhone && !/^84[35789]\d{8}$/.test(person.zaloPhone)) return 'Số điện thoại cần là số di động Việt Nam hợp lệ.';
  const ids = [person.fatherId, person.motherId, ...person.spouseIds].filter(Boolean) as string[];
  if (ids.includes(person.id)) return 'Một thành viên không thể có quan hệ với chính mình.';
  if (person.fatherId && person.fatherId === person.motherId) return 'Cha và mẹ phải là hai người khác nhau.';
  if (ids.some(id => !members.some(m => m.id === id))) return 'Có quan hệ trỏ đến thành viên không tồn tại.';
  if ([person.fatherId, person.motherId].some(id => id && descendantsOf(person.id, members).some(d => d.id === id))) return 'Quan hệ cha mẹ tạo thành vòng lặp.';
  return null;
}
