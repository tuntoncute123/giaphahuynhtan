import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMember } from "../lib/family";
import type { FamilyData } from "../lib/types";
import {
  ancestorIds,
  bookMembers,
  communityOf,
  emptyCommunity,
  graveRoute,
  lineagePath,
} from "../lib/community/model";
import { mutateCommunity } from "../lib/community/mutations";
import { recordRevision, replaceMember } from "../lib/community/revisions";
import { publicFamily } from "../lib/store";
const fixture = (): FamilyData => ({
  members: [
    normalizeMember({
      id: "root",
      fullName: "Huỳnh Tấn Tổ",
      gender: "Nam",
      deathDate: "2000-01-01",
    }),
    normalizeMember({
      id: "mother",
      fullName: "Nguyễn Thị Mẹ",
      gender: "Nữ",
      home: { address: "Riêng tư", latitude: 10, longitude: 106 },
      zaloPhone: "84901234567",
      zaloConsent: true,
    }),
    normalizeMember({
      id: "child",
      fullName: "Huỳnh Tấn Con",
      fatherId: "root",
      motherId: "mother",
      biography: "Cũ",
    }),
    normalizeMember({ id: "spouse", fullName: "Trần Thị Vợ", gender: "Nữ" }),
  ],
  content: [
    {
      id: "event",
      kind: "event",
      title: "Họp họ",
      date: "2099-01-01",
      description: "",
      location: "",
      fileUrl: "",
      createdAt: "",
    },
  ],
  shrines: [],
  reminders: [],
  reminderLogs: [],
  updatedAt: "",
  community: emptyCommunity(),
});
const run = (
  data: FamilyData,
  body: Record<string, unknown>,
  admin = true,
  owner = "browser-a",
) => mutateCommunity(data, body, admin, owner);

test("both ancestor lines, book branch spouses and cycles remain bounded", () => {
  const data = fixture();
  assert.deepEqual([...ancestorIds("child", data.members)].sort(), [
    "child",
    "mother",
    "root",
  ]);
  assert.deepEqual(
    lineagePath("child", data.members).map((m) => m.id),
    ["root", "child"],
  );
  assert.deepEqual(
    lineagePath("child", data.members, "mother").map((m) => m.id),
    ["mother", "child"],
  );
  data.members[2].spouseIds = ["spouse"];
  assert.deepEqual(
    bookMembers(data.members, "child").map((m) => m.id),
    ["child", "spouse"],
  );
  data.members[0].fatherId = "child";
  assert.equal(ancestorIds("child", data.members).size, 3);
});

test("public proposal is pending, approved atomically and restored with audit history", () => {
  const data = fixture();
  run(
    data,
    {
      action: "contribute",
      memberId: "child",
      patch: { biography: "Mới", spouseIds: ["spouse"] },
      author: "Cháu",
      reason: "Theo sách",
    },
    false,
  );
  assert.equal(data.members[2].biography, "Cũ");
  const proposal = communityOf(data).contributions[0];
  run(data, { action: "review", id: proposal.id, decision: "approved" });
  assert.equal(data.members[2].biography, "Mới");
  assert.deepEqual(data.members[3].spouseIds, ["child"]);
  const revision = communityOf(data).revisions[0];
  run(data, { action: "restore", id: revision.id });
  assert.equal(data.members[2].biography, "Cũ");
  assert.deepEqual(data.members[3].spouseIds, []);
  assert.equal(communityOf(data).revisions.length, 2);
});

test("review cannot overwrite a changed field; repeated decision and restore conflict fail", () => {
  const data = fixture();
  run(
    data,
    {
      action: "contribute",
      memberId: "child",
      patch: { biography: "Góp ý" },
      author: "Cháu",
      reason: "Căn cứ",
    },
    false,
  );
  data.members[2].biography = "Người khác đã sửa";
  const proposal = communityOf(data).contributions[0];
  assert.throws(
    () =>
      run(data, { action: "review", id: proposal.id, decision: "approved" }),
    /đã thay đổi/,
  );
  run(data, { action: "review", id: proposal.id, decision: "rejected" });
  assert.throws(
    () =>
      run(data, { action: "review", id: proposal.id, decision: "approved" }),
    /đã được xử lý/,
  );
  const before = structuredClone(data.members[2]);
  const after = { ...before, occupation: "Thầy giáo" };
  replaceMember(data, after);
  recordRevision(data, before, after, "Sửa nghề");
  data.members[2].occupation = "Bác sĩ";
  assert.throws(
    () =>
      run(data, { action: "restore", id: communityOf(data).revisions[0].id }),
    /thay đổi mới/,
  );
});

test("unauthorized moderation, private fields, invalid dates and parent cycles are rejected", () => {
  const data = fixture();
  for (const action of [
    "review",
    "restore",
    "photo",
    "memory",
    "task",
    "grave",
    "source",
    "delete",
  ])
    assert.throws(() => run(data, { action }, false), /đăng nhập/);
  assert.throws(
    () =>
      run(
        data,
        {
          action: "contribute",
          memberId: "child",
          patch: { zaloPhone: "84901234567" },
        },
        false,
      ),
    /Không cho phép/,
  );
  assert.throws(
    () =>
      run(
        data,
        {
          action: "contribute",
          memberId: "child",
          patch: { birthDate: "2025-02-30" },
        },
        false,
      ),
    /Ngày không hợp lệ/,
  );
  assert.throws(
    () => replaceMember(data, { ...data.members[0], fatherId: "child" }),
    /vòng lặp/,
  );
});

test("attendance is upserted by browser, isolated across browsers and cancellable", () => {
  const data = fixture();
  const body = {
    action: "attend",
    eventId: "event",
    name: "Nhà Hai",
    guests: 2,
    note: "Ghi chú riêng",
  };
  run(data, body, false);
  run(data, { ...body, guests: 4 }, false);
  assert.equal(communityOf(data).attendance.length, 1);
  assert.equal(communityOf(data).attendance[0].guests, 4);
  run(data, body, false, "browser-b");
  assert.equal(communityOf(data).attendance.length, 2);
  run(data, { action: "cancelAttendance", eventId: "event" }, false);
  assert.equal(communityOf(data).attendance.length, 1);
  assert.equal(communityOf(data).attendance[0].owner, "browser-b");
  assert.throws(() => run(data, { ...body, guests: -1 }, false), /Số người/);
  data.content[0].date = "2000-01-01";
  assert.throws(() => run(data, body, false), /đã qua/);
});

test("public payload omits proposals, revisions, contact data and registration ownership", () => {
  const data = fixture();
  run(
    data,
    {
      action: "attend",
      eventId: "event",
      name: "A",
      guests: 0,
      note: "Bí mật",
    },
    false,
  );
  run(
    data,
    {
      action: "contribute",
      memberId: "child",
      author: "A",
      reason: "Riêng",
      patch: { biography: "B" },
    },
    false,
  );
  recordRevision(
    data,
    data.members[1],
    { ...data.members[1], fullName: "Tên mới" },
    "Lịch sử",
  );
  const output = publicFamily(data, false);
  assert.equal(output.members[1].home.address, "");
  assert.equal(output.members[1].zaloPhone, "");
  assert.equal(output.community?.contributions.length, 0);
  assert.equal(output.community?.revisions.length, 0);
  assert.equal(output.community?.attendance[0].owner, "");
  assert.equal(output.community?.attendance[0].note, "");
  assert.equal(data.members[1].home.address, "Riêng tư");
});

test("photo tags, audio consent, citations, visits and route are validated", () => {
  const data = fixture();
  const url = "/api/files/00000000-0000-0000-0000-000000000000.jpg";
  run(data, {
    action: "photo",
    title: "Họp họ",
    imageUrl: url,
    tags: [{ memberId: "child", x: 40, y: 60 }],
    eventId: "event",
  });
  assert.throws(
    () =>
      run(data, {
        action: "photo",
        title: "Lỗi",
        imageUrl: url,
        tags: [{ memberId: "child", x: 110, y: 1 }],
      }),
    /Vị trí/,
  );
  assert.throws(
    () => run(data, { action: "memory", consent: false }),
    /đồng ý/,
  );
  run(data, {
    action: "memory",
    title: "Lời kể",
    narrator: "Bà",
    audioUrl: url.replace(".jpg", ".webm"),
    imageUrls: [url],
    memberIds: ["child"],
    consent: true,
  });
  run(data, {
    action: "source",
    memberId: "child",
    field: "biography",
    title: "Gia phả",
    page: "12",
    excerpt: "Cũ",
    status: "verified",
  });
  recordRevision(
    data,
    data.members[2],
    { ...data.members[2], biography: "Đã sửa" },
    "Sửa",
  );
  assert.equal(communityOf(data).sources[0].status, "unverified");
  assert.throws(
    () =>
      run(data, {
        action: "source",
        memberId: "child",
        field: "biography",
        title: "Nguồn",
        page: "1",
        excerpt: "abc",
        status: "verified",
        url: "javascript:alert(1)",
      }),
    /Đường dẫn/,
  );
  run(data, {
    action: "grave",
    memberId: "root",
    cemetery: "Khu A",
    location: { address: "Làng", latitude: 15, longitude: 108 },
    instructions: "Cổng đông",
  });
  const grave = communityOf(data).graves[0];
  run(data, {
    action: "visit",
    graveId: grave.id,
    date: "2025-01-01",
    caretaker: "Cháu",
    note: "Dọn cỏ",
  });
  assert.equal(grave.visits.length, 1);
  assert.throws(
    () =>
      run(data, {
        action: "visit",
        graveId: grave.id,
        date: "2099-01-01",
        caretaker: "Cháu",
        note: "Dọn cỏ",
      }),
    /tương lai/,
  );
  assert.equal(
    new URL(graveRoute([grave])!).searchParams.get("destination"),
    "15,108",
  );
});

test("audio byte ranges support seeking, suffixes, and reject out-of-bounds ranges", async () => {
  const { fileResponse } = await import("../lib/file-response");
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);
  const response = fileResponse(
    bytes,
    "audio/webm",
    new Request("http://local/audio", { headers: { Range: "bytes=1-3" } }),
  );
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 1-3/5");
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    new Uint8Array([2, 3, 4]),
  );
  const suffix = fileResponse(
    bytes,
    "audio/webm",
    new Request("http://local/audio", { headers: { Range: "bytes=-2" } }),
  );
  assert.deepEqual(
    new Uint8Array(await suffix.arrayBuffer()),
    new Uint8Array([4, 5]),
  );
  assert.equal(
    fileResponse(
      bytes,
      "audio/webm",
      new Request("http://local/audio", { headers: { Range: "bytes=99-100" } }),
    ).status,
    416,
  );
});
