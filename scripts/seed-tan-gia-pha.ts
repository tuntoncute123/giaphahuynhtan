import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { database } from '../lib/database';
import { readFamily, updateFamily } from '../lib/store';
import type { FamilyData, Member } from '../lib/types';

type ExistingUpdate = {
  id: string;
  aliasesToAdd?: string[];
  spouseIdsToAdd?: string[];
  fatherId?: string;
  motherId?: string;
};
type Seed = { source: string; members: Member[]; updates: ExistingUpdate[] };

const root = process.cwd();
const familyFile = path.join(root, 'data/family.json');
const seedFile = path.join(root, 'data/tan-gia-pha-2023-seed.json');
let seed: Seed;
const mode = process.argv.includes('--database') ? 'database' : 'local';
const apply = process.argv.includes('--apply');

function merge(original: FamilyData) {
  const data = structuredClone(original);
  const byId = new Map(data.members.map(member => [member.id, member]));
  const initialIds = new Set(byId.keys());
  let added = 0;
  let updated = 0;

  for (const person of seed.members) {
    const existing = byId.get(person.id);
    if (existing) {
      if (existing.fullName !== person.fullName || existing.fatherId !== person.fatherId) {
        throw new Error(`ID ${person.id} đã được dùng cho hồ sơ khác.`);
      }
      continue;
    }
    if (!person.fullName.trim()) throw new Error(`Thiếu tên: ${person.id}`);
    const duplicate = data.members.find(member =>
      member.fullName === person.fullName && member.fatherId === person.fatherId &&
      member.motherId === person.motherId && member.birthOrder === person.birthOrder
    );
    if (duplicate) throw new Error(`Có thể trùng ${person.fullName}: ${duplicate.id} / ${person.id}`);
    const copy = structuredClone(person);
    data.members.push(copy);
    byId.set(copy.id, copy);
    added++;
  }

  for (const change of seed.updates) {
    if (!initialIds.has(change.id)) throw new Error(`Hồ sơ gốc không tồn tại: ${change.id}`);
    const person = byId.get(change.id)!;
    let touched = false;
    for (const field of ['fatherId', 'motherId'] as const) {
      const value = change[field];
      if (!value) continue;
      if (person[field] && person[field] !== value) throw new Error(`Quan hệ ${field} của ${person.id} đã khác dữ liệu gốc.`);
      if (!person[field]) { person[field] = value; touched = true; }
    }
    for (const alias of change.aliasesToAdd || []) {
      if (!person.aliases.includes(alias)) { person.aliases.push(alias); touched = true; }
    }
    for (const spouseId of change.spouseIdsToAdd || []) {
      if (!person.spouseIds.includes(spouseId)) { person.spouseIds.push(spouseId); touched = true; }
    }
    if (touched) updated++;
  }

  for (const member of data.members) {
    if (member.birthOrder !== null && (!Number.isInteger(member.birthOrder) || member.birthOrder < 1 || member.birthOrder > 30)) {
      throw new Error(`Thứ tự con không hợp lệ: ${member.id}`);
    }
    for (const parentId of [member.fatherId, member.motherId]) {
      if (parentId && !byId.has(parentId)) throw new Error(`Thiếu cha/mẹ ${parentId} của ${member.id}`);
      if (parentId === member.id) throw new Error(`Tự làm cha/mẹ: ${member.id}`);
    }
    if (member.fatherId && byId.get(member.fatherId)?.gender === 'Nữ') throw new Error(`Cha có giới tính nữ: ${member.id}`);
    if (member.motherId && byId.get(member.motherId)?.gender === 'Nam') throw new Error(`Mẹ có giới tính nam: ${member.id}`);
    for (const spouseId of member.spouseIds) {
      const spouse = byId.get(spouseId);
      if (!spouse || !spouse.spouseIds.includes(member.id)) throw new Error(`Quan hệ vợ chồng không đối xứng: ${member.id} / ${spouseId}`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function checkAncestors(id: string) {
    if (visiting.has(id)) throw new Error(`Vòng lặp cha mẹ ở ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    const person = byId.get(id)!;
    for (const parent of [person.fatherId, person.motherId]) if (parent) checkAncestors(parent);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) checkAncestors(id);
  data.updatedAt = new Date().toISOString();
  return { data, added, updated };
}

async function main() {
  seed = JSON.parse(await readFile(seedFile, 'utf8')) as Seed;
  if (mode === 'database') loadEnvConfig(root);
  if (mode === 'database' && !process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL.');
  const current = mode === 'database' ? await readFamily() : JSON.parse(await readFile(familyFile, 'utf8')) as FamilyData;
  const preview = merge(current);
  console.log(`${seed.source}: ${current.members.length} hiện có, thêm ${preview.added}, cập nhật ${preview.updated}; tổng ${preview.data.members.length}.`);
  if (!apply) return;
  if (mode === 'database') {
    const result = await updateFamily(data => {
      const merged = merge(data);
      Object.assign(data, merged.data);
      return { added: merged.added, updated: merged.updated, total: merged.data.members.length };
    });
    console.log('PostgreSQL:', result.result);
  } else {
    const temporary = `${familyFile}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(preview.data, null, 2) + '\n', 'utf8');
    await rename(temporary, familyFile);
    console.log('Đã cập nhật data/family.json.');
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (mode === 'database' && process.env.DATABASE_URL) await database().end();
});
