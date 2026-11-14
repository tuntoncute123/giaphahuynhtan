"use client";
import { useState } from "react";
import type { Grave } from "@/lib/types";
import { communityOf, graveRoute } from "@/lib/community/model";
import { directionsUrl } from "@/lib/location";
import { vietnamToday } from "@/lib/lunar";
import {
  AdminGate,
  Empty,
  MemberSelect,
  UploadField,
  useSubmit,
  type CommunityProps,
} from "./shared";
const blank = (): Omit<Grave, "id" | "createdAt" | "visits"> & {
  id?: string;
} => ({
  memberId: "",
  cemetery: "",
  location: { address: "", latitude: null, longitude: null },
  photoUrl: "",
  instructions: "",
});
export default function Graves(
  props: CommunityProps & { initialMemberId: string },
) {
  const { data, authenticated, act, openPerson } = props;
  const graves = communityOf(data).graves;
  const [editing, setEditing] = useState<ReturnType<typeof blank> | null>(null);
  const [cemetery, setCemetery] = useState("");
  const [selected, setSelected] = useState(
    graves.find((g) => g.memberId === props.initialMemberId)?.id || "",
  );
  const [stops, setStops] = useState<string[]>([]);
  const [visitId, setVisitId] = useState("");
  const [date, setDate] = useState(vietnamToday());
  const [caretaker, setCaretaker] = useState("");
  const [note, setNote] = useState("");
  const { busy, run, feedback } = useSubmit();
  const filtered = graves.filter((g) => !cemetery || g.cemetery === cemetery);
  const shown = filtered.find((g) => g.id === selected) || filtered[0];
  const route = graveRoute(
    stops
      .map((id) => graves.find((g) => g.id === id))
      .filter((g): g is Grave => !!g),
  );
  const memberName = (id: string) =>
    data.members.find((m) => m.id === id)?.fullName || "Hồ sơ không còn";
  const query = shown
    ? shown.location.latitude !== null && shown.location.longitude !== null
      ? `${shown.location.latitude},${shown.location.longitude}`
      : shown.location.address
    : "";
  return (
    <div className="community-stack">
      <div>
        <h2>Phần mộ & hành trình tảo mộ</h2>
        <p>
          Lưu ảnh bia mộ, vị trí, lối vào và nhật ký chăm sóc để con cháu dễ tìm
          về.
        </p>
      </div>
      {feedback}
      <AdminGate {...props}>
        <button className="primary-btn" onClick={() => setEditing(blank())}>
          Thêm phần mộ
        </button>
      </AdminGate>
      {editing && authenticated && (
        <form
          className="community-card community-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await act({ action: "grave", ...editing });
              setEditing(null);
            });
          }}
        >
          <MemberSelect
            members={data.members}
            value={editing.memberId}
            onChange={(memberId) => setEditing({ ...editing, memberId })}
          />
          <label>
            Nghĩa trang / khu mộ
            <input
              required
              maxLength={200}
              value={editing.cemetery}
              onChange={(e) =>
                setEditing({ ...editing, cemetery: e.target.value })
              }
            />
          </label>
          <label>
            Địa chỉ
            <input
              value={editing.location.address}
              maxLength={1000}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  location: { ...editing.location, address: e.target.value },
                })
              }
            />
          </label>
          <div className="community-grid two">
            <label>
              Vĩ độ
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                value={editing.location.latitude ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    location: {
                      ...editing.location,
                      latitude:
                        e.target.value === "" ? null : Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label>
              Kinh độ
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                value={editing.location.longitude ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    location: {
                      ...editing.location,
                      longitude:
                        e.target.value === "" ? null : Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
          <button
            type="button"
            className="outline-btn"
            onClick={() => {
              if (!navigator.geolocation) {
                alert(
                  "Trình duyệt không hỗ trợ vị trí. Hãy nhập tọa độ thủ công.",
                );
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (position) =>
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          location: {
                            ...current.location,
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                          },
                        }
                      : current,
                  ),
                () =>
                  alert(
                    "Không lấy được vị trí. Hãy cho phép truy cập vị trí hoặc nhập thủ công.",
                  ),
                { enableHighAccuracy: true, timeout: 10000 },
              );
            }}
          >
            Lấy vị trí hiện tại khi đang ở phần mộ
          </button>
          <UploadField
            label="Ảnh bia mộ"
            value={editing.photoUrl}
            onChange={(photoUrl) => setEditing({ ...editing, photoUrl })}
          />
          <label>
            Hướng dẫn lối vào
            <textarea
              rows={3}
              maxLength={4000}
              value={editing.instructions}
              onChange={(e) =>
                setEditing({ ...editing, instructions: e.target.value })
              }
              placeholder="Cổng phía đông, rẽ trái ở cây đa, hàng thứ ba…"
            />
          </label>
          <div className="community-actions">
            <button className="primary-btn" disabled={busy}>
              Lưu phần mộ
            </button>
            <button
              className="outline-btn"
              type="button"
              onClick={() => setEditing(null)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      <label>
        Lọc khu mộ
        <select
          value={cemetery}
          onChange={(e) => {
            setCemetery(e.target.value);
            setSelected("");
          }}
        >
          <option value="">Tất cả khu mộ</option>
          {[...new Set(graves.map((g) => g.cemetery))].sort().map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {shown && (
        <div className="community-card">
          <h3>Vị trí phần mộ {memberName(shown.memberId)}</h3>
          <iframe
            className="community-map"
            title={`Bản đồ phần mộ ${memberName(shown.memberId)}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`}
          />
          <p>{shown.location.address || query}</p>
          <a
            href={directionsUrl(shown.location)!}
            target="_blank"
            rel="noreferrer"
          >
            Mở chỉ đường đến phần mộ này
          </a>
        </div>
      )}
      <div className="community-card community-stack">
        <h3>Tuyến tảo mộ</h3>
        <p className="community-note">
          Chọn tối đa 3 phần mộ theo thứ tự muốn ghé để mở tuyến đường trên điện
          thoại. Điểm xuất phát được chọn trong Google Maps.
        </p>
        {stops.map((id, i) => {
          const grave = graves.find((g) => g.id === id);
          if (!grave) return null;
          return (
            <div key={id} className="community-actions">
              <span>
                {i + 1}. {memberName(grave.memberId)}
              </span>
              <button
                disabled={i === 0}
                onClick={() =>
                  setStops((current) => {
                    const next = [...current];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    return next;
                  })
                }
              >
                Đưa lên trước
              </button>
              <button
                onClick={() =>
                  setStops((current) => current.filter((value) => value !== id))
                }
              >
                Bỏ điểm
              </button>
            </div>
          );
        })}
        {route && (
          <a
            className="primary-btn"
            href={route}
            target="_blank"
            rel="noreferrer"
          >
            Mở tuyến tảo mộ (
            {stops.filter((id) => graves.some((g) => g.id === id)).length} điểm)
          </a>
        )}
      </div>
      {!filtered.length && <Empty>Chưa có phần mộ trong lựa chọn này.</Empty>}
      <div className="community-grid two">
        {filtered.map((grave) => (
          <article className="community-card community-stack" key={grave.id}>
            {grave.photoUrl && (
              <img
                className="community-cover"
                src={grave.photoUrl}
                alt={`Bia mộ ${memberName(grave.memberId)}`}
                loading="lazy"
              />
            )}
            <h3>{memberName(grave.memberId)}</h3>
            <p>
              {grave.cemetery} · {grave.location.address}
            </p>
            <p className="community-prewrap">{grave.instructions}</p>
            <div className="community-actions">
              <button
                className="outline-btn"
                onClick={() => {
                  setSelected(grave.id);
                  document
                    .querySelector(".community-map")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                Xem trên bản đồ
              </button>
              <button onClick={() => openPerson(grave.memberId)}>
                Mở hồ sơ
              </button>
              <button
                disabled={stops.includes(grave.id) || stops.length >= 3}
                onClick={() => setStops([...stops, grave.id])}
              >
                {stops.includes(grave.id) ? "Đã thêm tuyến" : "Thêm vào tuyến"}
              </button>
            </div>
            <details>
              <summary>
                Lịch sử chăm sóc ({grave.visits.length})
                {grave.visits[0]
                  ? ` · gần nhất ${grave.visits[0].date.split("-").reverse().join("/")}`
                  : ""}
              </summary>
              {grave.visits.map((visit) => (
                <p key={visit.id}>
                  <strong>
                    {visit.date} · {visit.caretaker}
                  </strong>
                  <br />
                  {visit.note}
                </p>
              ))}
            </details>
            {authenticated && (
              <>
                <div className="community-actions">
                  <button
                    onClick={() =>
                      setEditing({ ...grave, location: { ...grave.location } })
                    }
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={() => {
                      setVisitId(visitId === grave.id ? "" : grave.id);
                      setDate(vietnamToday());
                      setNote("");
                    }}
                  >
                    Ghi lần chăm sóc
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Xóa phần mộ và nhật ký chăm sóc này?"))
                        void run(async () => {
                          await act({
                            action: "delete",
                            collection: "graves",
                            id: grave.id,
                          });
                          setStops((current) =>
                            current.filter((id) => id !== grave.id),
                          );
                        });
                    }}
                  >
                    Xóa
                  </button>
                </div>
                {visitId === grave.id && (
                  <form
                    className="community-stack"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        await act({
                          action: "visit",
                          graveId: grave.id,
                          date,
                          caretaker,
                          note,
                        });
                        setVisitId("");
                      });
                    }}
                  >
                    <label>
                      Ngày chăm sóc
                      <input
                        type="date"
                        required
                        max={vietnamToday()}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <label>
                      Người chăm sóc
                      <input
                        required
                        maxLength={120}
                        value={caretaker}
                        onChange={(e) => setCaretaker(e.target.value)}
                      />
                    </label>
                    <label>
                      Nội dung
                      <textarea
                        required
                        maxLength={2000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </label>
                    <button className="primary-btn" disabled={busy}>
                      Lưu nhật ký
                    </button>
                  </form>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
