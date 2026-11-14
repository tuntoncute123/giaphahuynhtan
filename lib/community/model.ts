import type {
  CommunityData,
  ContributionField,
  FamilyData,
  Member,
} from "../types";

export const fieldLabels: Record<ContributionField, string> = {
  fullName: "Họ và tên",
  birthDate: "Ngày sinh",
  deathDate: "Ngày mất",
  birthPlace: "Quê quán",
  currentPlace: "Nơi ở hiện tại",
  occupation: "Nghề nghiệp",
  biography: "Tiểu sử",
  avatar: "Ảnh đại diện",
  fatherId: "Cha",
  motherId: "Mẹ",
  spouseIds: "Phối ngẫu",
};
export const emptyCommunity = (): CommunityData => ({
  photos: [],
  memories: [],
  contributions: [],
  revisions: [],
  attendance: [],
  tasks: [],
  graves: [],
  sources: [],
});
export function communityOf(data: FamilyData): CommunityData {
  return { ...emptyCommunity(), ...data.community };
}
export function fieldValue(
  value: unknown,
  field: string,
  members: Member[],
): string {
  if (Array.isArray(value))
    return (
      value
        .map((id) => members.find((m) => m.id === id)?.fullName || id)
        .join(", ") || "Chưa ghi nhận"
    );
  if (field === "fatherId" || field === "motherId")
    return members.find((m) => m.id === value)?.fullName || "Chưa ghi nhận";
  return String(value || "Chưa ghi nhận");
}
// All recorded ancestors, including both maternal and paternal lines; tolerate old cycles.
export function ancestorIds(id: string, members: Member[]): Set<string> {
  const index = new Map(members.map((m) => [m.id, m]));
  const found = new Set<string>();
  const todo = [id];
  while (todo.length) {
    const current = todo.pop()!;
    if (found.has(current) || !index.has(current)) continue;
    found.add(current);
    const m = index.get(current)!;
    for (const parent of [m.fatherId, m.motherId])
      if (parent) todo.push(parent);
  }
  return found;
}
export function lineagePath(
  id: string,
  members: Member[],
  side: "father" | "mother" = "father",
): Member[] {
  const index = new Map(members.map((m) => [m.id, m]));
  const result: Member[] = [];
  const seen = new Set<string>();
  let current = index.get(id);
  while (current && !seen.has(current.id)) {
    result.unshift(current);
    seen.add(current.id);
    const parent: string | null =
      side === "father" ? current.fatherId : current.motherId;
    current = parent ? index.get(parent) : undefined;
  }
  return result;
}
export function bookMembers(members: Member[], rootId: string): Member[] {
  if (!rootId) return members;
  const chosen = new Set<string>();
  const todo = [rootId];
  while (todo.length) {
    const id = todo.pop()!;
    if (chosen.has(id)) continue;
    chosen.add(id);
    for (const m of members)
      if (m.fatherId === id || m.motherId === id) todo.push(m.id);
  }
  const withSpouses = new Set(chosen);
  for (const m of members)
    if (chosen.has(m.id)) m.spouseIds.forEach((id) => withSpouses.add(id));
  return members.filter((m) => withSpouses.has(m.id));
}
export function graveRoute(graves: CommunityData["graves"]): string | null {
  const destinations = graves
    .map((g) =>
      g.location.latitude !== null && g.location.longitude !== null
        ? `${g.location.latitude},${g.location.longitude}`
        : g.location.address,
    )
    .filter(Boolean);
  if (!destinations.length) return null;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destinations.at(-1)!);
  if (destinations.length > 1)
    url.searchParams.set("waypoints", destinations.slice(0, -1).join("|"));
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}
export function safeResourceUrl(value: string): boolean {
  return (
    /^\/api\/files\/[0-9a-f-]{36}\.(?:jpg|png|webp|pdf|webm|ogg|mp3|m4a|wav)$/.test(
      value,
    ) || /^https?:\/\/[^\s]+$/i.test(value)
  );
}
