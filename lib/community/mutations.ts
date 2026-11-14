import { normalizeLocation, locationError } from "../location";
import { vietnamToday } from "../lunar";
import type {
  ContributionField,
  FamilyData,
  FamilyPhoto,
  Grave,
  SourceCitation,
  VoiceMemory,
} from "../types";
import { communityOf, fieldLabels, safeResourceUrl } from "./model";
import {
  restoreRevision,
  reviewContribution,
  submitContribution,
} from "./revisions";
import {
  check,
  dateValue,
  eventExists,
  memberExists,
  stringList,
  textValue,
} from "./validation";

function resource(
  value: unknown,
  required = false,
  kind: "image" | "audio" | "any" = "any",
) {
  const url = textValue(value, "Đường dẫn tệp", 2000, required);
  if (url) {
    check(
      safeResourceUrl(url),
      "Đường dẫn tệp phải là tệp đã tải lên hoặc liên kết HTTP(S).",
    );
    if (kind === "audio")
      check(
        /^\/api\/files\/[0-9a-f-]{36}\.(webm|ogg|mp3|m4a|wav)$/.test(url),
        "Vui lòng tải tệp âm thanh lên trước.",
      );
    if (kind === "image" && url.startsWith("/"))
      check(/\.(jpg|png|webp)$/.test(url), "Cần chọn tệp hình ảnh.");
  }
  return url;
}
function upsert<T extends { id: string }>(
  items: T[],
  record: T,
  editing: unknown,
): T[] {
  if (editing)
    check(
      items.some((item) => item.id === editing),
      "Không tìm thấy bản ghi.",
      404,
    );
  return editing
    ? items.map((item) => (item.id === editing ? record : item))
    : [record, ...items];
}
export function mutateCommunity(
  data: FamilyData,
  body: Record<string, unknown>,
  admin: boolean,
  owner: string,
) {
  const action = body.action;
  const publicActions = ["contribute", "attend", "cancelAttendance"];
  check(typeof action === "string", "Thiếu thao tác.");
  check(
    admin || publicActions.includes(action),
    "Vui lòng đăng nhập quản trị.",
    401,
  );
  const c = (data.community = communityOf(data));
  const id = textValue(body.id, "Mã bản ghi", 100) || crypto.randomUUID();
  const createdAt = new Date().toISOString();
  switch (action) {
    case "contribute":
      submitContribution(data, body);
      break;
    case "review":
      reviewContribution(data, body);
      break;
    case "restore":
      restoreRevision(data, body);
      break;
    case "photo": {
      check(
        Array.isArray(body.tags) && body.tags.length <= 100,
        "Tối đa 100 người trong một ảnh.",
      );
      const tags = body.tags.map((tag) => {
        check(tag && typeof tag === "object", "Nhãn người không hợp lệ.");
        const { memberId, x, y } = tag as Record<string, unknown>;
        check(
          typeof x === "number" &&
            typeof y === "number" &&
            Number.isFinite(x) &&
            Number.isFinite(y) &&
            x >= 0 &&
            x <= 100 &&
            y >= 0 &&
            y <= 100,
          "Vị trí nhãn phải nằm trong ảnh.",
        );
        return { memberId: memberExists(data, memberId), x, y };
      });
      const photo: FamilyPhoto = {
        id,
        title: textValue(body.title, "Tên ảnh", 200, true),
        imageUrl: resource(body.imageUrl, true, "image"),
        eventId: eventExists(data, body.eventId),
        tags,
        createdAt: c.photos.find((p) => p.id === id)?.createdAt || createdAt,
      };
      c.photos = upsert(c.photos, photo, body.id);
      break;
    }
    case "memory": {
      check(
        body.consent === true,
        "Cần sự đồng ý của người kể để công khai bản ghi.",
      );
      const memory: VoiceMemory = {
        id,
        title: textValue(body.title, "Tiêu đề", 200, true),
        narrator: textValue(body.narrator, "Người kể", 120, true),
        description: textValue(body.description, "Nội dung", 20000),
        audioUrl: resource(body.audioUrl, true, "audio"),
        imageUrls: stringList(body.imageUrls, 12).map((url) =>
          resource(url, true, "image"),
        ),
        memberIds: stringList(body.memberIds).map((id) =>
          memberExists(data, id),
        ),
        eventId: eventExists(data, body.eventId),
        consent: true,
        createdAt: c.memories.find((m) => m.id === id)?.createdAt || createdAt,
      };
      c.memories = upsert(c.memories, memory, body.id);
      break;
    }
    case "attend": {
      const eventId = eventExists(data, body.eventId, false);
      const event = data.content.find((e) => e.id === eventId)!;
      check(
        !event.date || event.date >= vietnamToday(),
        "Sự kiện đã qua, không còn nhận đăng ký.",
      );
      check(
        Number.isInteger(body.guests) &&
          Number(body.guests) >= 0 &&
          Number(body.guests) <= 50,
        "Số người đi cùng từ 0 đến 50.",
      );
      const existing = c.attendance.find(
        (a) => a.eventId === eventId && a.owner === owner,
      );
      const registration = {
        id: existing?.id || crypto.randomUUID(),
        eventId,
        name: textValue(body.name, "Tên người đăng ký", 120, true),
        guests: Number(body.guests),
        note: textValue(body.note, "Ghi chú cho ban tổ chức", 1000),
        owner,
        createdAt: existing?.createdAt || createdAt,
      };
      c.attendance = upsert(c.attendance, registration, existing?.id);
      break;
    }
    case "cancelAttendance": {
      const item = c.attendance.find(
        (a) => a.eventId === body.eventId && a.owner === owner,
      );
      check(item, "Chưa có đăng ký trên trình duyệt này.", 404);
      c.attendance = c.attendance.filter((a) => a.id !== item.id);
      break;
    }
    case "task": {
      const task = {
        id,
        eventId: eventExists(data, body.eventId, false),
        title: textValue(body.title, "Công việc", 300, true),
        assigneeId: memberExists(data, body.assigneeId, true),
        done: body.done === true,
      };
      c.tasks = upsert(c.tasks, task, body.id);
      break;
    }
    case "grave": {
      const location = normalizeLocation(body.location);
      const error = locationError(location);
      check(!error, error || "Tọa độ không hợp lệ.");
      const raw = body.location as Record<string, unknown> | undefined;
      if (raw)
        for (const key of ["latitude", "longitude"])
          check(
            raw[key] === null ||
              raw[key] === "" ||
              raw[key] === undefined ||
              Number.isFinite(Number(raw[key])),
            "Tọa độ không hợp lệ.",
          );
      check(
        location.address || location.latitude !== null,
        "Cần địa chỉ hoặc tọa độ phần mộ.",
      );
      const grave: Grave = {
        id,
        memberId: memberExists(data, body.memberId),
        cemetery: textValue(body.cemetery, "Nghĩa trang / khu mộ", 200, true),
        location,
        photoUrl: resource(body.photoUrl, false, "image"),
        instructions: textValue(body.instructions, "Hướng dẫn lối vào", 4000),
        visits: c.graves.find((g) => g.id === id)?.visits || [],
        createdAt: c.graves.find((g) => g.id === id)?.createdAt || createdAt,
      };
      c.graves = upsert(c.graves, grave, body.id);
      break;
    }
    case "visit": {
      const grave = c.graves.find((g) => g.id === body.graveId);
      check(grave, "Không tìm thấy phần mộ.", 404);
      const date = dateValue(body.date, true);
      check(date <= vietnamToday(), "Ngày chăm sóc không thể ở tương lai.");
      grave.visits.unshift({
        id: crypto.randomUUID(),
        date,
        caretaker: textValue(body.caretaker, "Người chăm sóc", 120, true),
        note: textValue(body.note, "Nội dung chăm sóc", 2000, true),
      });
      grave.visits.sort((a, b) => b.date.localeCompare(a.date));
      break;
    }
    case "source": {
      check(
        typeof body.field === "string" &&
          Object.hasOwn(fieldLabels, body.field),
        "Chọn thông tin cần đối chiếu.",
      );
      check(
        body.status === "verified" || body.status === "unverified",
        "Trạng thái không hợp lệ.",
      );
      const source: SourceCitation = {
        id,
        memberId: memberExists(data, body.memberId),
        field: body.field as ContributionField,
        title: textValue(body.title, "Tên tư liệu", 300, true),
        url: resource(body.url),
        page: textValue(body.page, "Trang / đoạn", 80, true),
        excerpt: textValue(body.excerpt, "Trích dẫn / ghi chú", 10000, true),
        status: body.status,
        createdAt: c.sources.find((s) => s.id === id)?.createdAt || createdAt,
      };
      c.sources = upsert(c.sources, source, body.id);
      break;
    }
    case "delete": {
      const collection = body.collection;
      check(
        collection === "photos" ||
          collection === "memories" ||
          collection === "tasks" ||
          collection === "graves" ||
          collection === "sources",
        "Không thể xóa bộ dữ liệu này.",
      );
      check(
        c[collection].some((item) => item.id === body.id),
        "Không tìm thấy bản ghi.",
        404,
      );
      // Assignment retains the discriminated collection's record type.
      Object.assign(c, {
        [collection]: c[collection].filter((item) => item.id !== body.id),
      });
      break;
    }
    default:
      check(false, "Thao tác không được hỗ trợ.");
  }
}
