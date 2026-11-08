import { getLunarDate, getSolarDate } from '@dqcai/vn-lunar';
import type { LunarAnniversary, Member, Shrine } from './types';

export type MemorialEvent = { key: string; title: string; kind: 'person' | 'shrine'; lunar: LunarAnniversary; location: string; sourceId: string };
export const emptyAnniversary = (): LunarAnniversary => ({ day: 1, month: 1, leap: false, missingLeap: 'regular', missingDay: 'last' });
export function normalizeAnniversary(input: unknown): LunarAnniversary | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Partial<LunarAnniversary>;
  const day = Number(value.day); const month = Number(value.month);
  if (!Number.isInteger(day) || !Number.isInteger(month) || day < 1 || day > 30 || month < 1 || month > 12) return null;
  return { day, month, leap: value.leap === true, missingLeap: value.missingLeap === 'skip' ? 'skip' : 'regular', missingDay: value.missingDay === 'skip' ? 'skip' : 'last' };
}
export function anniversaryFromSolar(iso: string): LunarAnniversary | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  if (year < 1201 || year > 2198) return null;
  const lunar = getLunarDate(day, month, year);
  return lunar.day ? { day: lunar.day, month: lunar.month, leap: lunar.leap, missingLeap: 'regular', missingDay: 'last' } : null;
}
export function anniversaryLabel(value: LunarAnniversary | null): string {
  return value ? `${value.day}/${value.month} âm lịch${value.leap ? ' (tháng nhuận)' : ''}` : 'Chưa có ngày âm lịch';
}
export function memorialEvents(members: Member[], shrines: Shrine[]): MemorialEvent[] {
  const people: MemorialEvent[] = members.filter(m => !!m.deathDate || !!m.anniversary).flatMap(m => {
    const lunar = m.anniversary || anniversaryFromSolar(m.deathDate);
    return lunar ? [{ key: `person:${m.id}`, title: `Giỗ ${m.fullName}`, kind: 'person' as const, lunar, location: '', sourceId: m.id }] : [];
  });
  const places: MemorialEvent[] = shrines.filter(s => !!s.ceremony).map(s => ({ key: `shrine:${s.id}`, title: `Lễ giỗ tại ${s.name}`, kind: 'shrine' as const, lunar: s.ceremony!, location: s.location.address, sourceId: s.id }));
  return [...people, ...places];
}
const iso = (year: number, month: number, day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
export function solarOccurrence(anniversary: LunarAnniversary, lunarYear: number): string | null {
  if (lunarYear < 1200 || lunarYear > 2199) return null;
  for (const leap of anniversary.leap ? [true, ...(anniversary.missingLeap === 'regular' ? [false] : [])] : [false]) {
    for (let day = anniversary.day; day >= (anniversary.missingDay === 'last' ? Math.min(29, anniversary.day) : anniversary.day); day--) {
      const solar = getSolarDate(day, anniversary.month, lunarYear, leap);
      const actual = getLunarDate(solar.day, solar.month, solar.year);
      if (actual.day === day && actual.month === anniversary.month && actual.year === lunarYear && actual.leap === leap) return iso(solar.year, solar.month, solar.day);
    }
  }
  return null;
}
export function nextOccurrence(anniversary: LunarAnniversary, fromIso: string): string | null {
  const year = Number(fromIso.slice(0, 4));
  return [year - 1, year, year + 1, year + 2].map(y => solarOccurrence(anniversary, y)).filter((date): date is string => !!date && date >= fromIso).sort()[0] || null;
}
export function vietnamToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
export function shiftIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
}
