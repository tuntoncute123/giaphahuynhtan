import { normalizeMember, validateMember } from "../family";
import type {
  ContributionField,
  FamilyData,
  Member,
  MemberPatch,
} from "../types";
import {
  ancestorIds,
  communityOf,
  fieldLabels,
  safeResourceUrl,
} from "./model";
import {
  check,
  dateValue,
  memberExists,
  stringList,
  textValue,
} from "./validation";

export function validatedPatch(raw: unknown, data: FamilyData): MemberPatch {
  check(
    raw && typeof raw === "object" && !Array.isArray(raw),
    "Thông tin đề nghị không hợp lệ.",
  );
  const entries = Object.entries(raw);
  check(
    entries.length > 0 && entries.length <= Object.keys(fieldLabels).length,
    "Cần ít nhất một thay đổi.",
  );
  const patch: Record<string, unknown> = {};
  for (const [field, value] of entries) {
    check(
      Object.hasOwn(fieldLabels, field),
      "Không cho phép thay đổi trường này.",
    );
    if (field === "spouseIds")
      patch[field] = stringList(value, 20).map((id) => memberExists(data, id));
    else if (field === "fatherId" || field === "motherId")
      patch[field] = memberExists(data, value, true) || null;
    else if (field === "birthDate" || field === "deathDate")
      patch[field] = dateValue(value);
    else {
      const text = textValue(
        value,
        fieldLabels[field as ContributionField],
        field === "biography" ? 20000 : 1000,
        field === "fullName",
      );
      if (field === "avatar" && text)
        check(safeResourceUrl(text), "Đường dẫn ảnh không hợp lệ.");
      patch[field] = text;
    }
  }
  return patch as MemberPatch;
}
export function replaceMember(data: FamilyData, person: Member) {
  const error = validateMember(person, data.members);
  check(!error, error || "Hồ sơ không hợp lệ.");
  for (const id of [person.fatherId, person.motherId])
    if (id)
      check(
        !ancestorIds(id, data.members).has(person.id),
        "Quan hệ cha mẹ tạo thành vòng lặp.",
      );
  data.members = data.members.map((m) =>
    m.id === person.id
      ? person
      : { ...m, spouseIds: m.spouseIds.filter((id) => id !== person.id) },
  );
  for (const id of person.spouseIds) {
    const spouse = data.members.find((m) => m.id === id)!;
    spouse.spouseIds = [...new Set([...spouse.spouseIds, person.id])];
  }
}
export function recordRevision(
  data: FamilyData,
  before: Member,
  after: Member,
  reason: string,
) {
  const community = (data.community = communityOf(data));
  community.revisions.unshift({
    id: crypto.randomUUID(),
    memberId: before.id,
    before: structuredClone(before),
    after: structuredClone(after),
    reason,
    createdAt: new Date().toISOString(),
  });
  community.sources = community.sources.map((source) =>
    source.memberId === after.id &&
    JSON.stringify(before[source.field]) !== JSON.stringify(after[source.field])
      ? { ...source, status: "unverified" }
      : source,
  );
}
export function submitContribution(
  data: FamilyData,
  body: Record<string, unknown>,
) {
  const id = memberExists(data, body.memberId);
  const original = data.members.find((m) => m.id === id)!;
  const patch = validatedPatch(body.patch, data);
  const before: MemberPatch = {};
  for (const key of Object.keys(patch) as ContributionField[]) {
    if (JSON.stringify(patch[key]) === JSON.stringify(original[key]))
      delete patch[key];
    else Object.assign(before, { [key]: structuredClone(original[key]) });
  }
  check(Object.keys(patch).length, "Thông tin giống hồ sơ hiện tại.");
  const candidate = normalizeMember({ ...original, ...patch });
  const error = validateMember(candidate, data.members);
  check(!error, error || "Hồ sơ không hợp lệ.");
  const community = (data.community = communityOf(data));
  check(
    community.contributions.filter((c) => c.status === "pending").length < 1000,
    "Danh sách đang chờ duyệt đã đầy.",
  );
  community.contributions.unshift({
    id: crypto.randomUUID(),
    memberId: id,
    patch,
    before,
    author: textValue(body.author, "Tên người góp", 120, true),
    reason: textValue(body.reason, "Lý do và căn cứ", 2000, true),
    status: "pending",
    reviewNote: "",
    createdAt: new Date().toISOString(),
    reviewedAt: "",
  });
}
export function reviewContribution(
  data: FamilyData,
  body: Record<string, unknown>,
) {
  const community = (data.community = communityOf(data));
  const proposal = community.contributions.find((c) => c.id === body.id);
  check(proposal, "Không tìm thấy đề nghị.", 404);
  check(proposal.status === "pending", "Đề nghị đã được xử lý.", 409);
  check(
    body.decision === "approved" || body.decision === "rejected",
    "Quyết định không hợp lệ.",
  );
  if (body.decision === "approved") {
    const before = data.members.find((m) => m.id === proposal.memberId);
    check(before, "Hồ sơ đã bị xóa.", 409);
    for (const key of Object.keys(proposal.patch) as ContributionField[])
      check(
        JSON.stringify(before[key]) === JSON.stringify(proposal.before[key]),
        `${fieldLabels[key]} đã thay đổi kể từ lúc góp ý. Hãy từ chối và gửi đề nghị mới.`,
        409,
      );
    const after = normalizeMember({
      ...before,
      ...validatedPatch(proposal.patch, data),
    });
    replaceMember(data, after);
    recordRevision(
      data,
      before,
      after,
      `Duyệt góp ý của ${proposal.author}: ${proposal.reason}`,
    );
  }
  proposal.status = body.decision;
  proposal.reviewNote = textValue(body.reviewNote, "Ghi chú duyệt", 2000);
  proposal.reviewedAt = new Date().toISOString();
}
export function restoreRevision(
  data: FamilyData,
  body: Record<string, unknown>,
) {
  const community = (data.community = communityOf(data));
  const revision = community.revisions.find((r) => r.id === body.id);
  check(revision, "Không tìm thấy phiên bản.", 404);
  const current = data.members.find((m) => m.id === revision.memberId);
  check(current, "Hồ sơ đã bị xóa.", 409);
  const patch: Record<string, unknown> = {};
  // Undo only fields changed in this revision; refuse to overwrite later changes.
  for (const key of Object.keys(revision.after) as (keyof Member)[]) {
    if (
      key === "id" ||
      key === "createdAt" ||
      JSON.stringify(revision.before[key]) ===
        JSON.stringify(revision.after[key])
    )
      continue;
    check(
      JSON.stringify(current[key]) === JSON.stringify(revision.after[key]),
      "Hồ sơ đã có thay đổi mới ở cùng trường. Không thể khôi phục đè lên.",
      409,
    );
    patch[key] = revision.before[key];
  }
  check(Object.keys(patch).length, "Phiên bản không có thay đổi để khôi phục.");
  const after = normalizeMember({ ...current, ...patch });
  replaceMember(data, after);
  recordRevision(
    data,
    current,
    after,
    `Khôi phục thay đổi ngày ${revision.createdAt}`,
  );
}
