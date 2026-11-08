import type { Member } from './types';
import { siblingsOf } from './family';

export type AddressResult = { term: string; explanation: string; exact: boolean };
const ordinal: Record<number, string> = { 1: 'Cả', 2: 'Hai', 3: 'Ba', 4: 'Tư', 5: 'Năm', 6: 'Sáu', 7: 'Bảy', 8: 'Tám', 9: 'Chín', 10: 'Mười' };
const result = (term: string, explanation: string, exact = true): AddressResult => ({ term, explanation, exact });
const spouseOf = (a: Member, b: Member) => a.spouseIds.includes(b.id) || b.spouseIds.includes(a.id);
const ageOrder = (target: Member, reference: Member, sameHousehold = true): 'older' | 'younger' | 'unknown' => {
  if (sameHousehold && target.birthOrder !== null && reference.birthOrder !== null && target.birthOrder !== reference.birthOrder) return target.birthOrder < reference.birthOrder ? 'older' : 'younger';
  if (target.birthDate && reference.birthDate && target.birthDate !== reference.birthDate) return target.birthDate < reference.birthDate ? 'older' : 'younger';
  return 'unknown';
};
const siblings = (a: Member, b: Member) => siblingsOf(a, [a, b]).some(m => m.id === b.id);
const directParent = (child: Member, parent: Member) => child.fatherId === parent.id || child.motherId === parent.id;
function ancestorPath(start: Member, targetId: string, members: Member[], seen = new Set<string>()): Member[] | null {
  if (start.id === targetId) return [start];
  if (seen.has(start.id)) return null;
  seen.add(start.id);
  for (const id of [start.fatherId, start.motherId]) {
    const parent = members.find(m => m.id === id);
    if (parent) { const path = ancestorPath(parent, targetId, members, new Set(seen)); if (path) return [start, ...path]; }
  }
  return null;
}
function withNickname(base: AddressResult, target: Member): AddressResult {
  const preferred = target.aliases.find(alias => alias.toLocaleLowerCase('vi').startsWith(base.term.toLocaleLowerCase('vi')));
  if (preferred) return { ...base, term: preferred, explanation: `${base.explanation} Tên thường gọi: ${preferred}.` };
  if (target.birthOrder && ordinal[target.birthOrder] && ['cô', 'chú', 'bác', 'dì', 'cậu', 'anh', 'chị'].includes(base.term)) return { ...base, term: `${base.term} ${ordinal[target.birthOrder]}` };
  return base;
}
export function addressFor(speakerId: string, targetId: string, members: Member[]): AddressResult {
  const speaker = members.find(m => m.id === speakerId); const target = members.find(m => m.id === targetId);
  if (!speaker || !target) return result('Chưa xác định', 'Chọn bạn và người muốn xưng hô.', false);
  if (speaker.id === target.id) return result('bản thân', 'Bạn đang chọn chính mình.');
  if (spouseOf(speaker, target)) return result('vợ/chồng', 'Đây là người phối ngẫu của bạn. Cách xưng hô thân mật tùy gia đình.');
  const ancestor = ancestorPath(speaker, target.id, members);
  if (ancestor) {
    const depth = ancestor.length - 1;
    if (depth === 1) return result(target.gender === 'Nữ' ? 'mẹ' : target.gender === 'Nam' ? 'cha' : 'cha/mẹ', 'Người này là cha hoặc mẹ của bạn.');
    if (depth === 2) { const side = ancestor[1].id === speaker.fatherId ? 'nội' : 'ngoại'; return result(`${target.gender === 'Nữ' ? 'bà' : 'ông'} ${side}`, `Người này là ông/bà bên ${side} của bạn.`); }
    if (depth === 3) return result('cụ', 'Người này là cụ của bạn.');
    return result('tổ tiên', `Người này ở trên bạn ${depth} thế hệ.`);
  }
  const descendant = ancestorPath(target, speaker.id, members);
  if (descendant) return result(descendant.length === 2 ? 'con' : 'cháu', `Người này ở dưới bạn ${descendant.length - 1} thế hệ.`);
  if (siblings(speaker, target)) {
    const order = ageOrder(target, speaker);
    const term = order === 'older' ? target.gender === 'Nam' ? 'anh' : 'chị' : order === 'younger' ? 'em' : 'anh/chị/em';
    return withNickname(result(term, 'Hai người có chung cha hoặc mẹ.'), target);
  }
  for (const side of ['fatherId', 'motherId'] as const) {
    const parent = members.find(m => m.id === speaker[side]); if (!parent) continue;
    if (siblings(parent, target)) {
      const older = ageOrder(target, parent) === 'older';
      const term = side === 'fatherId' ? target.gender === 'Nữ' ? 'cô' : older ? 'bác' : 'chú' : target.gender === 'Nam' ? 'cậu' : older ? 'bác' : 'dì';
      return withNickname(result(term, `Người này là anh/chị/em của ${side === 'fatherId' ? 'cha' : 'mẹ'} bạn.${ageOrder(target, parent) === 'unknown' ? ' Chưa có đủ ngày sinh hoặc thứ tự để phân biệt bác/chú.' : ''}`, ageOrder(target, parent) !== 'unknown' || target.gender === 'Nữ'), target);
    }
    const auntUncle = members.find(m => siblings(parent, m) && spouseOf(m, target));
    if (auntUncle) return result('bác/thím/mợ/dượng', `Người này là phối ngẫu của anh/chị/em ${side === 'fatherId' ? 'cha' : 'mẹ'} bạn; gia đình có thể chọn cách gọi cụ thể.`, false);
  }
  const siblingsOfSpeaker = siblingsOf(speaker, members);
  if (siblingsOfSpeaker.some(s => directParent(target, s))) return result('cháu', 'Người này là con của anh/chị/em bạn.');
  const speakerParents = [speaker.fatherId, speaker.motherId].filter(Boolean);
  const targetParents = [target.fatherId, target.motherId].filter(Boolean);
  const cousin = speakerParents.some(id => targetParents.some(other => { const a = members.find(m => m.id === id); const b = members.find(m => m.id === other); return a && b && siblings(a, b); }));
  if (cousin) {
    const order = ageOrder(target, speaker, false); const term = order === 'older' ? target.gender === 'Nam' ? 'anh họ' : 'chị họ' : order === 'younger' ? 'em họ' : 'anh/chị/em họ';
    return result(term, 'Cha/mẹ của hai người là anh chị em.');
  }
  for (const spouseId of speaker.spouseIds) {
    const spouse = members.find(m => m.id === spouseId); if (!spouse) continue;
    if (directParent(spouse, target)) return result(target.gender === 'Nữ' ? 'mẹ vợ/chồng' : 'bố vợ/chồng', 'Người này là cha/mẹ của người phối ngẫu.');
    if (siblings(spouse, target)) return result('anh/chị/em vợ/chồng', 'Người này là anh/chị/em của người phối ngẫu.', false);
  }
  return result('chưa xác định', 'Gia phả hiện chưa có đủ liên kết để xác định vai vế. Có thể bổ sung thông tin cha, mẹ hoặc phối ngẫu.', false);
}
