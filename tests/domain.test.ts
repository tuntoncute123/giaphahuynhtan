import assert from 'node:assert/strict';
import test from 'node:test';
import { getLunarDate } from '@dqcai/vn-lunar';
import type { Member } from '../lib/types';
import { addressFor } from '../lib/kinship';
import { bySeniority, childrenOf, descendantsOf, matchesMember, siblingsOfRecordedParents } from '../lib/family';
import { anniversaryFromSolar, nextOccurrence, solarOccurrence } from '../lib/lunar';
import { directionsUrl } from '../lib/location';

const baseMember: Member = {
  id: '',
  fullName: '',
  aliases: [],
  birthOrder: null,
  gender: 'Nam',
  birthDate: '',
  deathDate: '',
  anniversary: null,
  birthPlace: 'Quảng Ngãi',
  currentPlace: '',
  home: { address: '', latitude: null, longitude: null },
  homePublic: false,
  zaloPhone: '',
  zaloConsent: false,
  occupation: '',
  biography: '',
  fatherId: null,
  motherId: null,
  spouseIds: [],
  avatar: '',
  createdAt: '2026-01-01T00:00:00.000Z'
};

test('Google Maps chỉ đường tới tọa độ hoặc địa chỉ đã lưu', () => {
  const coordinates = directionsUrl({ address: 'Địa chỉ cũ', latitude: 15.8801, longitude: 108.338 });
  assert.equal(new URL(coordinates!).searchParams.get('destination'), '15.8801,108.338');
  assert.equal(new URL(coordinates!).searchParams.get('api'), '1');
  const address = directionsUrl({ address: 'Nhà thờ họ Huỳnh Tấn, Hội An', latitude: null, longitude: null });
  assert.equal(new URL(address!).searchParams.get('destination'), 'Nhà thờ họ Huỳnh Tấn, Hội An');
  assert.equal(directionsUrl({ address: '', latitude: null, longitude: null }), null);
});

test('ngày Tết 2026 đổi đúng giữa âm và dương lịch Việt Nam', () => {
  assert.equal(solarOccurrence({ day: 1, month: 1, leap: false, missingLeap: 'regular', missingDay: 'last' }, 2026), '2026-02-17');
  assert.deepEqual(anniversaryFromSolar('2026-02-17'), { day: 1, month: 1, leap: false, missingLeap: 'regular', missingDay: 'last' });
  assert.equal(nextOccurrence({ day: 1, month: 1, leap: false, missingLeap: 'regular', missingDay: 'last' }, '2026-02-18'), '2027-02-06');
});
test('tháng nhuận và tháng thiếu có chính sách rõ ràng', () => {
  const leap = { day: 1, month: 2, leap: true, missingLeap: 'skip' as const, missingDay: 'last' as const };
  assert.equal(solarOccurrence(leap, 2023), '2023-03-22');
  assert.equal(solarOccurrence(leap, 2024), null);
  assert.ok(solarOccurrence({ ...leap, missingLeap: 'regular' }, 2024));
  const shortMonth = Array.from({ length: 12 }, (_, index) => index + 1).find(month => solarOccurrence({ day: 30, month, leap: false, missingLeap: 'regular', missingDay: 'skip' }, 2026) === null);
  assert.ok(shortMonth);
  const shifted = solarOccurrence({ day: 30, month: shortMonth!, leap: false, missingLeap: 'regular', missingDay: 'last' }, 2026);
  assert.ok(shifted);
  const [year, month, day] = shifted!.split('-').map(Number);
  assert.equal(getLunarDate(day, month, year).day, 29);
});
test('tìm biệt danh không dấu và xưng hô theo nhánh gia đình', () => {
  const members: Member[] = [
    { ...baseMember, id: 'ht-01', fullName: 'Huỳnh Tấn Công', gender: 'Nam', birthDate: '1918-03-12', deathDate: '1998-08-20', spouseIds: ['ht-02'] },
    { ...baseMember, id: 'ht-02', fullName: 'Nguyễn Thị An', gender: 'Nữ', birthDate: '1922-06-05', deathDate: '2005-11-01', spouseIds: ['ht-01'] },
    { ...baseMember, id: 'ht-03', fullName: 'Huỳnh Tấn Phúc', gender: 'Nam', birthDate: '1945-02-16', fatherId: 'ht-01', motherId: 'ht-02', spouseIds: ['ht-05'] },
    { ...baseMember, id: 'ht-05', fullName: 'Trần Thị Hương', gender: 'Nữ', birthDate: '1947-12-08', spouseIds: ['ht-03'] },
    { ...baseMember, id: 'ht-07', fullName: 'Huỳnh Tấn Bình', gender: 'Nam', birthDate: '1972-07-17', fatherId: 'ht-03', motherId: 'ht-05', spouseIds: ['ht-09'] },
    { ...baseMember, id: 'ht-08', fullName: 'Huỳnh Thị Mai', gender: 'Nữ', birthDate: '1975-01-29', fatherId: 'ht-03', motherId: 'ht-05', aliases: ['Cô Bảy'], birthOrder: 7 },
    { ...baseMember, id: 'ht-09', fullName: 'Phạm Thị Thu', gender: 'Nữ', birthDate: '1974-05-13', spouseIds: ['ht-07'] },
    { ...baseMember, id: 'ht-10', fullName: 'Huỳnh Tấn Nam', gender: 'Nam', birthDate: '2001-10-03', fatherId: 'ht-07', motherId: 'ht-09' },
    { ...baseMember, id: 'ht-11', fullName: 'Huỳnh Ngọc Hà', gender: 'Nữ', birthDate: '2004-08-15', fatherId: 'ht-07', motherId: 'ht-09' }
  ];
  const aunt = members.find(member => member.id === 'ht-08')!;
  assert.equal(matchesMember(aunt, 'co bay'), true);
  assert.equal(matchesMember(aunt, 'Huynh Thi Mai'), true);
  assert.equal(addressFor('ht-10', 'ht-08', members).term, 'Cô Bảy');
  assert.equal(addressFor('ht-10', 'ht-03', members).term, 'ông nội');
  assert.equal(addressFor('ht-11', 'ht-10', members).term, 'anh');
  assert.equal(addressFor('ht-10', 'ht-02', members).term, 'cụ');
});

test('xem đời trước chỉ gọi anh chị em ruột khi cả cha và mẹ trùng khớp', () => {
  const members: Member[] = [
    { ...baseMember, id: 'a', fullName: 'Con A', fatherId: 'f', motherId: 'm1' },
    { ...baseMember, id: 'b', fullName: 'Con B', fatherId: 'f', motherId: 'm1' },
    { ...baseMember, id: 'c', fullName: 'Con khác mẹ', fatherId: 'f', motherId: 'm2' },
    { ...baseMember, id: 'd', fullName: 'Chỉ ghi cha', fatherId: 'f' }
  ];
  assert.deepEqual(siblingsOfRecordedParents(members[0], members).map(member => member.id), ['b']);
  assert.deepEqual(siblingsOfRecordedParents(members[3], members).map(member => member.id).sort(), ['a', 'b', 'c']);
});

test('cây gia phả sắp xếp anh từ trái qua phải rồi mới đến em theo đúng gia phả', () => {
  const file = `${process.cwd()}/data/family.json`;
  const { readFileSync } = require('node:fs');
  const familyData = JSON.parse(readFileSync(file, 'utf8'));
  const allMembers: Member[] = familyData.members;

  // 1. Kiểm tra 9 con của cụ Huỳnh Tấn Hiền
  const hienChildren = childrenOf('ht-hien', allMembers);
  assert.equal(hienChildren.length, 9);
  assert.equal(hienChildren[0].fullName, 'Huỳnh Tấn Trường'); // Con trưởng
  assert.equal(hienChildren[1].fullName, 'Huỳnh Tấn Thọ');
  assert.equal(hienChildren[2].fullName, 'Huỳnh Tấn Tu');
  assert.equal(hienChildren[3].fullName, 'Huỳnh Tấn Liên');
  assert.equal(hienChildren[4].fullName, 'Huỳnh Thị Đợi');
  assert.equal(hienChildren[8].fullName, 'Huỳnh Thị Toán'); // Con út

  // 2. Kiểm tra 13 con của cụ Huỳnh Tấn Tu
  const tuChildren = childrenOf('ht-tu', allMembers);
  assert.equal(tuChildren.length, 13);
  assert.equal(tuChildren[0].fullName, 'Huỳnh Tấn Cự'); // Nhánh A (Trưởng nam)
  assert.equal(tuChildren[1].fullName, 'Huỳnh Tấn Địch');
  assert.equal(tuChildren[8].fullName, 'Huỳnh Tấn Tũng'); // Nhánh B
  assert.equal(tuChildren[9].fullName, 'Huỳnh Tấn Đoan'); // Nhánh C
  assert.equal(tuChildren[12].fullName, 'Huỳnh Thị Lý'); // Con út

  // 3. Kiểm tra 3 con của cụ Huỳnh Tấn Cự (Nhánh A)
  const cuChildren = childrenOf('ht-cu', allMembers);
  assert.deepEqual(cuChildren.map(c => c.fullName), [
    'Huỳnh Tấn Nghi', // A.1
    'Huỳnh Tấn Chừ',   // A.2
    'Huỳnh Tấn Ry'     // A.3
  ]);

  // 4. Kiểm tra 11 con của cụ Huỳnh Tấn Đoan (Nhánh C)
  const doanChildren = childrenOf('ht-doan', allMembers);
  assert.equal(doanChildren[0].fullName, 'Huỳnh Thị Pháng'); // C.1
  assert.equal(doanChildren[1].fullName, 'Huỳnh Thị Châu');   // C.2
  assert.equal(doanChildren[2].fullName, 'Huỳnh Tấn Sa');     // C.3
  assert.equal(doanChildren[4].fullName, 'Huỳnh Tấn Nhung');  // C.5
  assert.equal(doanChildren[10].fullName, 'Huỳnh Tấn Bổ');   // C.11

  // 5. Kiểm tra mẹ hiển thị đầy đủ con cái và hậu duệ
  // Bà Nguyễn Thị Phòng (vợ cụ Huỳnh Tấn Tu)
  const phongChildren = childrenOf('ht-tu-w2', allMembers);
  assert.equal(phongChildren.length, 13);
  assert.equal(phongChildren[0].fullName, 'Huỳnh Tấn Cự');
  assert.ok(descendantsOf('ht-tu-w2', allMembers).length > 100);

  // Bà Võ Thị Trung (vợ cụ Huỳnh Tấn Tu)
  const trungChildren = childrenOf('ht-tu-w1', allMembers);
  assert.equal(trungChildren.length, 13);

  // Bà Thái Thị Là (vợ cụ Huỳnh Tấn Hiền)
  const laChildren = childrenOf('ht-hien-w', allMembers);
  assert.equal(laChildren.length, 9);
  assert.ok(descendantsOf('ht-hien-w', allMembers).length > 100);

  // 6. Kiểm tra cách gọi vai vế anh đầu là Anh Hai, anh thứ 2 là Anh Ba, anh thứ 3 là Anh Tư
  // Cụ Tu gọi cụ Trường (con đầu lòng, birthOrder 1): Anh Hai
  assert.equal(addressFor('ht-tu', 'ht-truong', allMembers).term, 'Anh Hai');
  // Cụ Tu gọi cụ Thọ (con thứ 2, birthOrder 2): Anh Ba
  assert.equal(addressFor('ht-tu', 'ht-tho', allMembers).term, 'Anh Ba');
  // Cụ Liên gọi cụ Tu (con thứ 3, birthOrder 3): Anh Tư
  assert.equal(addressFor('ht-lien', 'ht-tu', allMembers).term, 'Anh Tư');
});

test('phân biệt người trùng tên qua cha mẹ và ông bà', () => {
  const file = `${process.cwd()}/data/family.json`;
  const { readFileSync } = require('node:fs');
  const familyData = JSON.parse(readFileSync(file, 'utf8'));
  const allMembers: Member[] = familyData.members;
  const { hasDuplicateName, lineageOf } = require('../lib/family');

  const toan1 = allMembers.find(m => m.id === 'ht-a2-toan')!;
  const toan2 = allMembers.find(m => m.id === 'ht-c5-toan')!;
  assert.equal(hasDuplicateName(toan1, allMembers), true);
  assert.equal(hasDuplicateName(toan2, allMembers), true);

  const lineage1 = lineageOf(toan1, allMembers);
  const lineage2 = lineageOf(toan2, allMembers);
  assert.ok(lineage1.includes('Huỳnh Tấn Lan'));
  assert.ok(lineage1.includes('Huỳnh Tấn Ka'));
  assert.ok(lineage2.includes('Huỳnh Tấn Tân'));
  assert.ok(lineage2.includes('Huỳnh Tấn Thận'));
  assert.notEqual(lineage1, lineage2);

  const thuy1 = allMembers.find(m => m.id === 'ht-a2-dien-w')!;
  const thuy2 = allMembers.find(m => m.id === 'ht-c5-dung-w')!;
  assert.equal(hasDuplicateName(thuy1, allMembers), true);
  assert.ok(lineageOf(thuy1, allMembers).includes('Huỳnh Tấn Diện'));
  assert.ok(lineageOf(thuy2, allMembers).includes('Huỳnh Tấn Dũng'));
});

test('tính năng tin tức & hoạt động dòng họ (giỗ, đi lễ, tiệc họ)', () => {
  const { displayNewsDate, CATEGORY_INFO } = require('../components/NewsView');
  assert.equal(displayNewsDate('2026-02-15'), 'Ngày 15 tháng 2, 2026');
  assert.equal(displayNewsDate('2026-11-20'), 'Ngày 20 tháng 11, 2026');
  assert.equal(CATEGORY_INFO.gio.label, 'Lễ giỗ dòng họ');
  assert.equal(CATEGORY_INFO.le.label, 'Đi lễ · Tảo mộ');
  assert.equal(CATEGORY_INFO.tiec.label, 'Bữa tiệc · Họp họ');
  assert.equal(CATEGORY_INFO.khac.label, 'Tin tức · Khác');
});
