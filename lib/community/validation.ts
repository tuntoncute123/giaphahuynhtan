import type { FamilyData } from "../types";
export class CommunityError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function check(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new CommunityError(message, status);
}
export function textValue(
  value: unknown,
  label: string,
  max = 2000,
  required = false,
): string {
  check(
    typeof value === "string" || value === undefined || value === null,
    `${label} không hợp lệ.`,
  );
  const result = String(value || "").trim();
  check(
    result.length <= max && (!required || result.length > 0),
    `${label}: ${required ? "cần nhập và " : ""}tối đa ${max} ký tự.`,
  );
  return result;
}
export function memberExists(
  data: FamilyData,
  id: unknown,
  optional = false,
): string {
  if (optional && !id) return "";
  check(
    typeof id === "string" && data.members.some((m) => m.id === id),
    "Không tìm thấy thành viên.",
  );
  return id;
}
export function eventExists(
  data: FamilyData,
  id: unknown,
  optional = true,
): string {
  if (optional && !id) return "";
  check(
    typeof id === "string" &&
      data.content.some((e) => e.id === id && e.kind === "event"),
    "Không tìm thấy sự kiện.",
  );
  return id;
}
export function dateValue(value: unknown, required = false): string {
  const result = textValue(value, "Ngày", 10, required);
  if (result)
    check(
      /^\d{4}-\d{2}-\d{2}$/.test(result) &&
        Number.isFinite(Date.parse(result)) &&
        new Date(result).toISOString().slice(0, 10) === result,
      "Ngày không hợp lệ.",
    );
  return result;
}
export function stringList(value: unknown, max = 30): string[] {
  check(
    Array.isArray(value) &&
      value.length <= max &&
      value.every((v) => typeof v === "string"),
    `Danh sách không hợp lệ (tối đa ${max}).`,
  );
  return [...new Set(value)];
}
