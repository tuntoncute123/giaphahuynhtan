"use client";
import { useEffect, useState } from "react";
import { communityOf } from "@/lib/community/model";
import { vietnamToday } from "@/lib/lunar";
import { Empty, MemberSelect, useSubmit, type CommunityProps } from "./shared";
export default function Gatherings(props: CommunityProps) {
  const { data, authenticated, act, mine } = props;
  const events = data.content
    .filter((e) => e.kind === "event")
    .sort((a, b) => b.date.localeCompare(a.date));
  const [eventId, setEventId] = useState(
    events.find((e) => e.date >= vietnamToday())?.id || events[0]?.id || "",
  );
  const [name, setName] = useState("");
  const [guests, setGuests] = useState(0);
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const { busy, run, feedback } = useSubmit();
  const c = communityOf(data);
  const event = events.find((e) => e.id === eventId);
  const registration = mine.find((a) => a.eventId === eventId);
  const registrations = c.attendance.filter((a) => a.eventId === eventId);
  const total = registrations.reduce((sum, a) => sum + 1 + a.guests, 0);
  const past = !!event?.date && event.date < vietnamToday();
  useEffect(() => {
    setName(registration?.name || "");
    setGuests(registration?.guests || 0);
    setNote(registration?.note || "");
  }, [
    eventId,
    registration?.id,
    registration?.name,
    registration?.guests,
    registration?.note,
  ]);
  return (
    <div className="community-stack">
      <div>
        <h2>Chuẩn bị giỗ & họp họ</h2>
        <p>
          Đăng ký tham dự, chốt số người và theo dõi công việc chuẩn bị cùng gia
          đình.
        </p>
      </div>
      {feedback}
      {!events.length ? (
        <Empty>
          Chưa có sự kiện.{" "}
          <a href="#news">Tạo bài giỗ / họp họ ở mục Tin tức · Hoạt động</a> rồi
          quay lại tổ chức tại đây.
        </Empty>
      ) : (
        <>
          <label>
            Chọn buổi họp mặt
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} · {e.date}
                </option>
              ))}
            </select>
          </label>
          {event && (
            <article className="community-card community-stack">
              <h3>{event.title}</h3>
              <p>
                {event.date.split("-").reverse().join("/")} ·{" "}
                {event.location || "Chưa ghi địa điểm"}
              </p>
              <p className="community-prewrap">{event.description}</p>
              <div className="community-stat-row">
                <strong>{registrations.length} đăng ký</strong>
                <strong>{total} người dự kiến</strong>
                <strong>
                  {Math.ceil(total / 10)} mâm × 10 người (ước tính)
                </strong>
              </div>
              {past ? (
                <p className="community-note">
                  Sự kiện đã qua. Danh sách và công việc được giữ lại để đối
                  chiếu.
                </p>
              ) : (
                <form
                  className="community-stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(
                      () =>
                        act({ action: "attend", eventId, name, guests, note }),
                      "Đã lưu đăng ký tham dự.",
                    );
                  }}
                >
                  <div className="community-grid two">
                    <label>
                      Tên người đại diện
                      <input
                        required
                        maxLength={120}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <label>
                      Số người đi cùng (không tính bạn)
                      <input
                        type="number"
                        min={0}
                        max={50}
                        required
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                      />
                    </label>
                  </div>
                  <label>
                    Ghi chú riêng cho ban tổ chức
                    <textarea
                      maxLength={1000}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <p className="community-note">
                    Tên và số người tham dự sẽ hiển thị trong danh sách. Bạn có
                    thể sửa hoặc hủy trên trình duyệt này; chọn hồ sơ “Tôi”
                    không xác thực danh tính.
                  </p>
                  <button className="primary-btn" disabled={busy}>
                    {registration
                      ? "Cập nhật đăng ký của tôi"
                      : "Đăng ký tham dự"}
                  </button>
                </form>
              )}
              {registration && (
                <button
                  className="outline-btn"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Hủy đăng ký tham dự của bạn?"))
                      void run(() =>
                        act({ action: "cancelAttendance", eventId }),
                      );
                  }}
                >
                  Hủy đăng ký của tôi
                </button>
              )}
            </article>
          )}
          <div className="community-grid two">
            <div className="community-card">
              <h3>Danh sách tham dự</h3>
              {registrations.length ? (
                <ul className="community-list">
                  {registrations.map((a) => (
                    <li key={a.id}>
                      <strong>{a.name}</strong>
                      <span>{a.guests + 1} người</span>
                      {authenticated && a.note && <p>{a.note}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Chưa có người đăng ký.</Empty>
              )}
            </div>
            <div className="community-card community-stack">
              <h3>Phân công chuẩn bị</h3>
              {c.tasks
                .filter((t) => t.eventId === eventId)
                .map((t) => (
                  <div key={t.id} className="community-task">
                    <label className="community-check">
                      <input
                        type="checkbox"
                        checked={t.done}
                        disabled={!authenticated || busy}
                        onChange={(e) =>
                          void run(() =>
                            act({
                              action: "task",
                              ...t,
                              done: e.target.checked,
                            }),
                          )
                        }
                      />
                      <span>
                        {t.title}
                        <small>
                          {data.members.find((m) => m.id === t.assigneeId)
                            ?.fullName || "Chưa phân công"}
                        </small>
                      </span>
                    </label>
                    {authenticated && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            act({
                              action: "delete",
                              collection: "tasks",
                              id: t.id,
                            }),
                          )
                        }
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                ))}
              {!c.tasks.some((t) => t.eventId === eventId) && (
                <p>Chưa có công việc.</p>
              )}
              {authenticated && (
                <form
                  className="community-stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await act({
                        action: "task",
                        eventId,
                        title: task,
                        assigneeId,
                        done: false,
                      });
                      setTask("");
                      setAssigneeId("");
                    });
                  }}
                >
                  <label>
                    Công việc mới
                    <input
                      required
                      maxLength={300}
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      placeholder="Chuẩn bị lễ vật, đặt bàn…"
                    />
                  </label>
                  <MemberSelect
                    members={data.members}
                    value={assigneeId}
                    onChange={setAssigneeId}
                    label="Người phụ trách"
                    optional
                  />
                  <button className="outline-btn" disabled={busy}>
                    Thêm công việc
                  </button>
                </form>
              )}
            </div>
          </div>
          <div className="community-card community-stack">
            <h3>Ảnh của buổi họp mặt</h3>
            <div className="community-thumbnails">
              {[
                ...new Set([
                  ...(event?.images || []),
                  ...(event?.fileUrl &&
                  /\.(jpg|png|webp)(\?|$)/i.test(event.fileUrl)
                    ? [event.fileUrl]
                    : []),
                  ...c.photos
                    .filter((p) => p.eventId === eventId)
                    .map((p) => p.imageUrl),
                ]),
              ].map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt={`Ảnh ${event?.title}`} loading="lazy" />
                </a>
              ))}
            </div>
            <a href="#community/album">Thêm ảnh và gắn sự kiện trong Album</a>
          </div>
        </>
      )}
    </div>
  );
}
