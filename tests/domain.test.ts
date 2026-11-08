import assert from 'node:assert/strict';
import test from 'node:test';
import { getLunarDate } from '@dqcai/vn-lunar';
import { seedData } from '../lib/seed';
import { addressFor } from '../lib/kinship';
import { matchesMember } from '../lib/family';
import { anniversaryFromSolar, nextOccurrence, solarOccurrence } from '../lib/lunar';
import { directionsUrl } from '../lib/location';

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
  const members = seedData.members.map(member => member.id === 'ht-08' ? { ...member, aliases: ['Cô Bảy'], birthOrder: 7 } : member);
  const aunt = members.find(member => member.id === 'ht-08')!;
  assert.equal(matchesMember(aunt, 'co bay'), true);
  assert.equal(matchesMember(aunt, 'Huynh Thi Mai'), true);
  assert.equal(addressFor('ht-10', 'ht-08', members).term, 'Cô Bảy');
  assert.equal(addressFor('ht-10', 'ht-03', members).term, 'ông nội');
  assert.equal(addressFor('ht-11', 'ht-10', members).term, 'anh');
  assert.equal(addressFor('ht-10', 'ht-02', members).term, 'cụ');
});
