import type { Member } from './types';
import { siblingsOf } from './family';

export type AddressResult = {
  term: string;
  explanation: string;
  reciprocal?: string;
  exact: boolean;
};

// Theo phong tục địa phương (Quảng Ngãi, Nam Bộ, Miền Trung):
// Con đầu / anh (chị) đầu gọi là "Hai", con thứ hai gọi là "Ba", con thứ ba gọi là "Tư"...
const ordinal: Record<number, string> = {
  1: 'Hai',
  2: 'Ba',
  3: 'Tư',
  4: 'Năm',
  5: 'Sáu',
  6: 'Bảy',
  7: 'Tám',
  8: 'Chín',
  9: 'Mười',
  10: 'Mười Một',
  11: 'Mười Hai',
  12: 'Mười Ba',
  13: 'Mười Bốn',
  14: 'Mười Lăm',
  15: 'Mười Sáu'
};

const result = (term: string, explanation: string, reciprocal = '', exact = true): AddressResult => ({
  term,
  explanation,
  reciprocal,
  exact
});

const spouseOf = (a: Member, b: Member) => a.spouseIds.includes(b.id) || b.spouseIds.includes(a.id);

function getAncestorsWithPaths(startId: string, members: Member[]): Map<string, { depth: number; path: string[] }> {
  const byId = new Map(members.map(m => [m.id, m]));
  const visited = new Map<string, { depth: number; path: string[] }>();
  const queue: [string, number, string[]][] = [[startId, 0, [startId]]];

  while (queue.length > 0) {
    const [currId, depth, path] = queue.shift()!;
    if (visited.has(currId) && visited.get(currId)!.depth <= depth) continue;
    visited.set(currId, { depth, path });

    const m = byId.get(currId);
    if (!m) continue;
    for (const pid of [m.fatherId, m.motherId]) {
      if (pid && byId.has(pid)) {
        queue.push([pid, depth + 1, [...path, pid]]);
      }
    }
  }

  return visited;
}

// Compare seniority of two siblings or branches
function compareBranchSeniority(
  a: Member,
  b: Member
): 'older' | 'younger' | 'unknown' {
  if (a.id === b.id) return 'unknown';

  // Check aliases like "A.", "B.", "C." or "C.3.1", "C.3.3"
  const extractCode = (m: Member): string | null => {
    for (const al of [m.id, ...m.aliases]) {
      const match = al.match(/^([A-C](?:\.\d+)*)/);
      if (match) return match[1];
    }
    return null;
  };

  const codeA = extractCode(a);
  const codeB = extractCode(b);
  if (codeA && codeB && codeA !== codeB) {
    return codeA < codeB ? 'older' : 'younger';
  }

  // Check birthOrder
  if (a.birthOrder !== null && b.birthOrder !== null && a.birthOrder !== b.birthOrder) {
    return a.birthOrder < b.birthOrder ? 'older' : 'younger';
  }

  // Check birthDate
  if (a.birthDate && b.birthDate && a.birthDate !== b.birthDate) {
    return a.birthDate < b.birthDate ? 'older' : 'younger';
  }

  return 'unknown';
}

function withNickname(base: AddressResult, target: Member): AddressResult {
  const preferred = target.aliases.find(alias =>
    alias.toLocaleLowerCase('vi').startsWith(base.term.toLocaleLowerCase('vi'))
  );
  if (preferred) {
    return { ...base, term: preferred, explanation: `${base.explanation} Tên thường gọi: ${preferred}.` };
  }
  if (target.birthOrder && ordinal[target.birthOrder] && ['cô', 'chú', 'bác', 'dì', 'cậu', 'anh', 'chị'].includes(base.term.toLocaleLowerCase('vi'))) {
    const prefix = base.term.charAt(0).toUpperCase() + base.term.slice(1);
    return { ...base, term: `${prefix} ${ordinal[target.birthOrder]}` };
  }
  return base;
}

export function addressFor(speakerId: string, targetId: string, members: Member[]): AddressResult {
  const byId = new Map(members.map(m => [m.id, m]));
  const speaker = byId.get(speakerId);
  const target = byId.get(targetId);

  if (!speaker || !target) {
    return result('Chưa xác định', 'Chọn bạn và người muốn xưng hô.', '', false);
  }

  if (speaker.id === target.id) {
    return result('Bản thân', 'Bạn đang chọn chính mình.', 'Tôi');
  }

  // 1. Trực tiếp vợ chồng
  if (spouseOf(speaker, target)) {
    if (speaker.gender === 'Nam' && target.gender === 'Nữ') {
      return result('Vợ', 'Người này là vợ / bà xã của bạn.', 'Chồng / Anh');
    }
    if (speaker.gender === 'Nữ' && target.gender === 'Nam') {
      return result('Chồng', 'Người này là chồng / ông xã của bạn.', 'Vợ / Em');
    }
    return result('Vợ/Chồng', 'Đây là người phối ngẫu của bạn.', 'Vợ/Chồng');
  }

  // Find blood relatives for speaker and target if they married into the family
  const getBloodContext = (m: Member): { blood: Member; isSpouse: boolean; spouseMember: Member | null } => {
    if (m.fatherId || m.motherId) {
      return { blood: m, isSpouse: false, spouseMember: null };
    }
    for (const sid of m.spouseIds) {
      const spouse = byId.get(sid);
      if (spouse && (spouse.fatherId || spouse.motherId)) {
        return { blood: spouse, isSpouse: true, spouseMember: spouse };
      }
    }
    return { blood: m, isSpouse: false, spouseMember: null };
  };

  const speakerContext = getBloodContext(speaker);
  const targetContext = getBloodContext(target);

  // If target married to speaker's parent
  if (speaker.fatherId && target.spouseIds.includes(speaker.fatherId)) {
    return result(target.gender === 'Nữ' ? 'Mẹ' : 'Cha', target.gender === 'Nữ' ? 'Người này là vợ của cha bạn.' : 'Người này là chồng của mẹ bạn.');
  }
  if (speaker.motherId && target.spouseIds.includes(speaker.motherId)) {
    return result(target.gender === 'Nam' ? 'Cha' : 'Mẹ', target.gender === 'Nam' ? 'Người này là chồng của mẹ bạn.' : 'Người này là vợ của cha bạn.');
  }

  // If target is parent of speaker's spouse
  for (const sid of speaker.spouseIds) {
    const sp = byId.get(sid);
    if (sp && (sp.fatherId === target.id || sp.motherId === target.id)) {
      return result(
        target.gender === 'Nam' ? (speaker.gender === 'Nữ' ? 'Bố chồng' : 'Bố vợ') : (speaker.gender === 'Nữ' ? 'Mẹ chồng' : 'Mẹ vợ'),
        `Người này là cha/mẹ của ${speaker.gender === 'Nữ' ? 'chồng' : 'vợ'} bạn.`
      );
    }
  }

  // Trace ancestors in the bloodline
  const ancSpeaker = getAncestorsWithPaths(speakerContext.blood.id, members);
  const ancTarget = getAncestorsWithPaths(targetContext.blood.id, members);

  // Common ancestors
  const commonIds = Array.from(ancSpeaker.keys()).filter(id => ancTarget.has(id));

  if (commonIds.length === 0) {
    // If no direct common ancestor found in parent chain, check siblingsOfSpeaker
    const sSiblings = siblingsOf(speaker, members);
    if (sSiblings.some(s => s.id === target.id)) {
      const order = compareBranchSeniority(target, speaker);
      const term = order === 'older' ? (target.gender === 'Nam' ? 'anh' : 'chị') : order === 'younger' ? 'em' : 'anh/chị/em';
      return withNickname(result(term, 'Hai người có chung cha hoặc mẹ.', order === 'older' ? 'em' : 'anh/chị'), target);
    }
    return result('Chưa xác định', 'Gia phả hiện chưa có thông tin nối chung tổ tiên giữa hai người.', '', false);
  }

  // Pick lowest common ancestor (minimal total depth)
  const lcaId = commonIds.reduce((best, curr) => {
    const totalDist = ancSpeaker.get(curr)!.depth + ancTarget.get(curr)!.depth;
    const bestDist = ancSpeaker.get(best)!.depth + ancTarget.get(best)!.depth;
    return totalDist < bestDist ? curr : best;
  }, commonIds[0]);

  const lca = byId.get(lcaId)!;
  const pathS = ancSpeaker.get(lcaId)!.path; // [speakerBlood, ..., childOfLCA_S, lca]
  const pathT = ancTarget.get(lcaId)!.path; // [targetBlood, ..., childOfLCA_T, lca]

  const ds = pathS.length - 1; // distance from speaker's blood relative to LCA
  const dt = pathT.length - 1; // distance from target's blood relative to LCA
  const diff = ds - dt; // difference in generations

  // Check branch seniority if diverging below LCA
  let branchRelation: 'older' | 'younger' | 'same' | 'unknown' = 'unknown';
  if (ds >= 1 && dt >= 1) {
    const childS = byId.get(pathS[pathS.length - 2])!;
    const childT = byId.get(pathT[pathT.length - 2])!;
    if (childS.id === childT.id) {
      branchRelation = 'same';
    } else {
      branchRelation = compareBranchSeniority(childT, childS);
    }
  }

  // --- TRƯỜNG HỢP 1: TARGET LÀ TỔ TIÊN TRỰC HỆ (dt === 0, ds > 0) ---
  if (dt === 0 && ds > 0 && !targetContext.isSpouse) {
    if (ds === 1) {
      return result(target.gender === 'Nữ' ? 'mẹ' : 'cha', 'Người này là cha hoặc mẹ ruột của bạn.', 'Con');
    }
    if (ds === 2) {
      const isFatherSide = pathS[1] === speaker.fatherId;
      const side = isFatherSide ? 'nội' : 'ngoại';
      return result(
        target.gender === 'Nữ' ? `bà ${side}` : `ông ${side}`,
        `Người này là ông/bà bên ${side} của bạn.`,
        'Cháu'
      );
    }
    if (ds === 3) {
      return result('cụ', 'Người này là cụ (ông cố / bà cố) của bạn.', 'Chắt');
    }
    if (ds === 4) {
      return result(target.gender === 'Nữ' ? 'kỵ bà' : 'kỵ ông', 'Người này là kỵ (ông sơ / bà sơ) của bạn.', 'Chút');
    }
    return result('cụ tổ', `Người này là tổ tiên ở trên bạn ${ds} thế hệ trong dòng họ.`, 'Hậu duệ');
  }

  // --- TRƯỜNG HỢP 2: TARGET LÀ HẬU DUỆ TRỰC HỆ (ds === 0, dt > 0) ---
  if (ds === 0 && dt > 0 && !speakerContext.isSpouse) {
    if (dt === 1) {
      return result(target.gender === 'Nữ' ? 'con gái' : 'con trai', 'Người này là con ruột của bạn.', 'Cha/Mẹ');
    }
    if (dt === 2) {
      return result(target.gender === 'Nữ' ? 'cháu gái' : 'cháu trai', 'Người này là cháu nội/ngoại của bạn.', 'Ông/Bà');
    }
    if (dt === 3) {
      return result('chắt', 'Người này là chắt của bạn (dưới bạn 3 đời).', 'Cụ');
    }
    if (dt === 4) {
      return result('chút', 'Người này là chút của bạn (dưới bạn 4 đời).', 'Kỵ');
    }
    return result('hậu duệ', `Người này là hậu duệ dưới bạn ${dt} thế hệ trong dòng họ.`, 'Cụ tổ');
  }

  // --- TRƯỜNG HỢP 3: CÙNG THẾ HỆ (diff === 0, ds === dt) ---
  if (diff === 0) {
    const isDirectSibling = ds === 1 && dt === 1 && !speakerContext.isSpouse && !targetContext.isSpouse;
    const isSenior = branchRelation === 'older' || (branchRelation === 'unknown' && compareBranchSeniority(target, speaker) === 'older');

    if (isDirectSibling) {
      const order = compareBranchSeniority(target, speaker);
      const term = order === 'older'
        ? (target.gender === 'Nam' ? 'anh' : 'chị')
        : (order === 'younger' ? 'em' : 'anh/chị/em');
      return withNickname(
        result(term, 'Hai người là anh chị em ruột (cùng cha hoặc mẹ).', order === 'older' ? 'em' : 'anh/chị'),
        target
      );
    }

    // Họ hàng cùng thế hệ (Cousins)
    const isTargetSpouse = targetContext.isSpouse;
    if (isTargetSpouse) {
      // Phối ngẫu của anh/chị/em họ
      if (target.gender === 'Nữ') {
        return result(isSenior ? 'Chị dâu' : 'Em dâu', `Người này là vợ của ${isSenior ? 'anh họ' : 'em họ'} bạn (chung tổ tiên ${lca.fullName}).`, isSenior ? 'Em' : 'Anh/Chị');
      } else {
        return result(isSenior ? 'Anh rể' : 'Em rể', `Người này là chồng của ${isSenior ? 'chị họ' : 'em họ'} bạn (chung tổ tiên ${lca.fullName}).`, isSenior ? 'Em' : 'Anh/Chị');
      }
    }

    if (speakerContext.isSpouse) {
      const spGender = speaker.gender;
      if (isSenior) {
        return result(target.gender === 'Nam' ? 'Anh' : 'Chị', `Người này là anh/chị họ của bạn đời bạn (chi trên trong dòng họ).`, 'Em');
      } else {
        return result('Em', `Người này là em họ của bạn đời bạn (chi thứ trong dòng họ).`, spGender === 'Nam' ? 'Anh' : 'Chị');
      }
    }

    if (isSenior) {
      const term = target.gender === 'Nam' ? 'anh họ' : 'chị họ';
      return withNickname(
        result(
          term,
          `Hai người cùng đời trong gia phả (chung tổ tiên ${lca.fullName}). Người này thuộc chi trên hoặc lớn tuổi hơn.`,
          'Em họ'
        ),
        target
      );
    } else {
      return withNickname(
        result(
          'em họ',
          `Hai người cùng đời trong gia phả (chung tổ tiên ${lca.fullName}). Người này thuộc chi dưới hoặc nhỏ tuổi hơn.`,
          speaker.gender === 'Nam' ? 'Anh họ' : 'Chị họ'
        ),
        target
      );
    }
  }

  // --- TRƯỜNG HỢP 4: TARGET Ở THẾ HỆ TRÊN SPEAKER 1 ĐỜI (diff === 1, ds = dt + 1) ---
  // (Bậc Chú, Bác, Cô, Cậu, Dì)
  if (diff === 1) {
    const isDirectAuntUncle = dt === 1 && ds === 2;
    const isSenior = branchRelation === 'older' || (branchRelation === 'unknown' && target.birthDate && speaker.fatherId && byId.get(speaker.fatherId)?.birthDate && target.birthDate < byId.get(speaker.fatherId)!.birthDate);

    if (targetContext.isSpouse) {
      if (target.gender === 'Nữ') {
        const term = isSenior ? 'Bác dâu' : 'Thím';
        return result(term, `Người này là vợ của ${isSenior ? 'bác' : 'chú'} bạn trong dòng họ (chung tổ tiên ${lca.fullName}).`, 'Cháu');
      } else {
        return result('Dượng', `Người này là chồng của cô bạn trong dòng họ (chung tổ tiên ${lca.fullName}).`, 'Cháu');
      }
    }

    if (target.gender === 'Nam') {
      const term = isSenior ? 'bác' : 'chú';
      return withNickname(
        result(
          term,
          `Người này cùng hàng với cha bạn trong dòng họ (chung tổ tiên ${lca.fullName}). Thuộc chi ${isSenior ? 'trên (bác)' : 'dưới (chú)'}.`,
          'Cháu'
        ),
        target
      );
    } else {
      const term = isSenior && isDirectAuntUncle ? 'bác' : 'cô';
      return withNickname(
        result(
          term,
          `Người này là cô / bác gái của bạn trong dòng họ (chung tổ tiên ${lca.fullName}).`,
          'Cháu'
        ),
        target
      );
    }
  }

  // --- TRƯỜNG HỢP 5: TARGET Ở THẾ HỆ TRÊN SPEAKER 2 ĐỜI (diff === 2, ds = dt + 2) ---
  // (Bậc Ông bác, Ông chú, Bà cô)
  if (diff === 2) {
    const isSenior = branchRelation === 'older';
    if (targetContext.isSpouse) {
      if (target.gender === 'Nữ') {
        return result(isSenior ? 'Bà bác' : 'Bà thím', `Người này là vợ của ông ${isSenior ? 'bác' : 'chú'} trong dòng họ.`, 'Cháu');
      } else {
        return result('Ông dượng', `Người này là chồng của bà cô trong dòng họ.`, 'Cháu');
      }
    }
    if (target.gender === 'Nam') {
      const term = isSenior ? 'ông bác' : 'ông chú';
      return withNickname(
        result(term, `Người này cùng hàng với ông nội của bạn trong dòng họ (chung tổ tiên ${lca.fullName}).`, 'Cháu'),
        target
      );
    } else {
      return withNickname(
        result('bà cô', `Người này cùng hàng với ông nội của bạn trong dòng họ (bà cô họ, chung tổ tiên ${lca.fullName}).`, 'Cháu'),
        target
      );
    }
  }

  // --- TRƯỜNG HỢP 6: TARGET Ở THẾ HỆ TRÊN SPEAKER 3 ĐỜI (diff === 3) ---
  if (diff === 3) {
    const term = target.gender === 'Nữ' ? 'cụ bà' : 'cụ ông';
    return result(`${term}`, `Người này cùng hàng với cụ của bạn trong dòng họ (trên bạn 3 đời, chung tổ tiên ${lca.fullName}).`, 'Chắt');
  }

  // --- TRƯỜNG HỢP 7: TARGET Ở THẾ HỆ TRÊN SPEAKER 4 ĐỜI (diff === 4) ---
  if (diff === 4) {
    const term = target.gender === 'Nữ' ? 'kỵ bà' : 'kỵ ông';
    return result(`${term}`, `Người này cùng hàng với kỵ của bạn trong dòng họ (trên bạn 4 đời, chung tổ tiên ${lca.fullName}).`, 'Chút');
  }

  // --- TRƯỜNG HỢP 8: TARGET Ở TRÊN SPEAKER >= 5 ĐỜI (diff >= 5) ---
  if (diff >= 5) {
    return result('cụ tổ', `Người này thuộc hàng tiền bối, ở trên bạn ${diff} đời trong dòng tộc (chung tổ tiên ${lca.fullName}).`, 'Hậu duệ');
  }

  // --- TRƯỜNG HỢP 9: TARGET Ở THẾ HỆ DƯỚI SPEAKER (diff < 0) ---
  if (diff === -1) {
    // Bậc Cháu (thế hệ con của anh chị em hoặc anh chị em họ)
    if (targetContext.isSpouse) {
      return result(target.gender === 'Nữ' ? 'Cháu dâu' : 'Cháu rể', `Người này là ${target.gender === 'Nữ' ? 'vợ' : 'chồng'} của cháu bạn trong dòng họ.`, speaker.gender === 'Nam' ? 'Bác/Chú' : 'Bác/Cô');
    }
    return withNickname(
      result('cháu', `Người này ở thế hệ dưới bạn 1 đời (bậc cháu trong dòng tộc, chung tổ tiên ${lca.fullName}).`, speaker.gender === 'Nam' ? 'Bác/Chú' : 'Cô/Dì'),
      target
    );
  }

  if (diff === -2) {
    // Bậc Cháu gọi bằng Ông/Bà (thế hệ dưới 2 đời)
    if (targetContext.isSpouse) {
      return result(target.gender === 'Nữ' ? 'Cháu dâu' : 'Cháu rể', `Người này là ${target.gender === 'Nữ' ? 'vợ' : 'chồng'} của cháu nội/ngoại trong dòng họ.`, speaker.gender === 'Nam' ? 'Ông' : 'Bà');
    }
    return withNickname(
      result('cháu', `Người này ở dưới bạn 2 đời (gọi bạn bằng ông/bà, chung tổ tiên ${lca.fullName}).`, speaker.gender === 'Nam' ? 'Ông' : 'Bà'),
      target
    );
  }

  if (diff === -3) {
    // Bậc Chắt (dưới 3 đời)
    if (targetContext.isSpouse) {
      return result(target.gender === 'Nữ' ? 'Chắt dâu' : 'Chắt rể', `Người này là ${target.gender === 'Nữ' ? 'vợ' : 'chồng'} của chắt bạn trong dòng họ.`, 'Cụ');
    }
    return result('chắt', `Người này ở dưới bạn 3 đời (gọi bạn bằng cụ, chung tổ tiên ${lca.fullName}).`, 'Cụ');
  }

  if (diff === -4) {
    // Bậc Chút (dưới 4 đời)
    return result('chút', `Người này ở dưới bạn 4 đời trong gia phả (chung tổ tiên ${lca.fullName}).`, 'Kỵ');
  }

  if (diff <= -5) {
    // Hậu duệ (dưới >= 5 đời)
    return result('hậu duệ', `Người này ở dưới bạn ${Math.abs(diff)} đời trong dòng họ (chung tổ tiên ${lca.fullName}).`, 'Cụ tổ');
  }

  return result('họ hàng', `Hai người có quan hệ huyết thống trong dòng họ Huỳnh Tấn (chung tổ tiên ${lca.fullName}).`, '');
}
