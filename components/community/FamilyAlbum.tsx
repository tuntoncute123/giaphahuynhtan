"use client";
import { useState } from "react";
import type { FamilyPhoto, PhotoTag } from "@/lib/types";
import { communityOf } from "@/lib/community/model";
import { addressFor } from "@/lib/kinship";
import {
  AdminGate,
  Empty,
  EventSelect,
  MemberSelect,
  UploadField,
  useSubmit,
  type CommunityProps,
} from "./shared";
const blank = (): Omit<FamilyPhoto, "id" | "createdAt"> & { id?: string } => ({
  title: "",
  imageUrl: "",
  eventId: "",
  tags: [],
});
export default function FamilyAlbum(
  props: CommunityProps & { selfId: string; initialMemberId: string },
) {
  const { data, act, authenticated, openPerson, selfId } = props;
  const [editing, setEditing] = useState<ReturnType<typeof blank> | null>(null);
  const [tagId, setTagId] = useState("");
  const [filter, setFilter] = useState(props.initialMemberId);
  const [eventId, setEventId] = useState("");
  const { busy, run, feedback } = useSubmit();
  const photos = communityOf(data).photos;
  const tagName = (tag: PhotoTag) =>
    data.members.find((m) => m.id === tag.memberId)?.fullName ||
    "Hồ sơ không còn";
  const tagLabel = (tag: PhotoTag) =>
    `${tagName(tag)}${selfId && selfId !== tag.memberId ? ` · ${addressFor(selfId, tag.memberId, data.members).term}` : ""}`;
  const placeTag = (x: number, y: number) => {
    if (editing && tagId)
      setEditing({
        ...editing,
        tags: [
          ...editing.tags.filter((t) => t.memberId !== tagId),
          { memberId: tagId, x, y },
        ],
      });
  };
  return (
    <div className="community-stack">
      <div>
        <h2>Album nhận mặt bà con</h2>
        <p>
          Chạm vào tên trên ảnh để mở hồ sơ và biết cách xưng hô với người đó.
        </p>
      </div>
      <div className="community-grid two">
        <MemberSelect
          members={data.members}
          value={filter}
          onChange={setFilter}
          label="Người trong ảnh"
          optional
        />
        <EventSelect data={data} value={eventId} onChange={setEventId} />
      </div>
      <AdminGate {...props}>
        <button
          className="primary-btn"
          onClick={() => {
            setEditing(blank());
            setTagId("");
          }}
        >
          Thêm ảnh & gắn tên
        </button>
      </AdminGate>
      {feedback}
      {editing && authenticated && (
        <form
          className="community-card community-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await act({ action: "photo", ...editing });
              setEditing(null);
            });
          }}
        >
          <h3>{editing.id ? "Chỉnh sửa ảnh" : "Ảnh mới"}</h3>
          <label>
            Tên ảnh
            <input
              required
              maxLength={200}
              value={editing.title}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value })
              }
            />
          </label>
          <UploadField
            label="Ảnh gia đình"
            value={editing.imageUrl}
            onChange={(imageUrl) =>
              setEditing({ ...editing, imageUrl, tags: [] })
            }
          />
          <label>
            Hoặc chọn ảnh từ tin tức
            <select
              value=""
              onChange={(e) => {
                if (e.target.value)
                  setEditing({
                    ...editing,
                    imageUrl: e.target.value,
                    tags: [],
                  });
              }}
            >
              <option value="">Chọn ảnh đã đăng</option>
              {data.content.flatMap((c) =>
                [...new Set([...(c.images || []), c.fileUrl])]
                  .filter((url) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url))
                  .map((url, i) => (
                    <option key={`${c.id}-${i}`} value={url}>
                      {c.title} · ảnh {i + 1}
                    </option>
                  )),
              )}
            </select>
          </label>
          <EventSelect
            data={data}
            value={editing.eventId}
            onChange={(eventId) => setEditing({ ...editing, eventId })}
          />
          {editing.imageUrl && (
            <>
              <MemberSelect
                members={data.members}
                value={tagId}
                onChange={setTagId}
                label="Người cần gắn tên"
                optional
              />
              <p className="community-note">
                Chọn người rồi chạm vào vị trí của họ trên ảnh. Có thể dùng nút
                đặt giữa và chỉnh tọa độ bằng bàn phím.
              </p>
              <div
                className="tagged-photo editing"
                onClick={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  placeTag(
                    ((e.clientX - box.left) / box.width) * 100,
                    ((e.clientY - box.top) / box.height) * 100,
                  );
                }}
              >
                <img
                  src={editing.imageUrl}
                  alt={editing.title || "Ảnh đang gắn tên"}
                />
                {editing.tags.map((t) => (
                  <span
                    key={t.memberId}
                    className="photo-pin"
                    style={{ left: `${t.x}%`, top: `${t.y}%` }}
                  >
                    {tagName(t)}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="outline-btn"
                disabled={!tagId}
                onClick={() => placeTag(50, 50)}
              >
                Đặt tên đã chọn ở giữa ảnh
              </button>
              {editing.tags.map((t) => (
                <div className="community-tag-editor" key={t.memberId}>
                  <strong>{tagName(t)}</strong>
                  <label>
                    Ngang (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(t.x)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          tags: editing.tags.map((item) =>
                            item.memberId === t.memberId
                              ? { ...item, x: Number(e.target.value) }
                              : item,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Dọc (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(t.y)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          tags: editing.tags.map((item) =>
                            item.memberId === t.memberId
                              ? { ...item, y: Number(e.target.value) }
                              : item,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        tags: editing.tags.filter(
                          (item) => item.memberId !== t.memberId,
                        ),
                      })
                    }
                  >
                    Gỡ tên
                  </button>
                </div>
              ))}
            </>
          )}
          <div className="community-actions">
            <button
              className="primary-btn"
              disabled={busy || !editing.imageUrl}
            >
              Lưu ảnh
            </button>
            <button
              type="button"
              className="outline-btn"
              onClick={() => setEditing(null)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      <div className="community-grid two">
        {photos
          .filter(
            (p) =>
              (!filter || p.tags.some((t) => t.memberId === filter)) &&
              (!eventId || p.eventId === eventId),
          )
          .map((photo) => (
            <article className="community-card" key={photo.id}>
              <div className="tagged-photo">
                <img src={photo.imageUrl} alt={photo.title} loading="lazy" />
                {photo.tags.map((t) => (
                  <button
                    key={t.memberId}
                    className="photo-pin"
                    style={{ left: `${t.x}%`, top: `${t.y}%` }}
                    onClick={() => openPerson(t.memberId)}
                    title={tagLabel(t)}
                  >
                    {tagName(t)}
                  </button>
                ))}
              </div>
              <h3>{photo.title}</h3>
              {photo.eventId && (
                <p className="community-note">
                  {data.content.find((c) => c.id === photo.eventId)?.title}
                </p>
              )}
              <div className="community-chips">
                {photo.tags.map((t) => (
                  <button
                    key={t.memberId}
                    onClick={() => openPerson(t.memberId)}
                  >
                    {tagLabel(t)}
                  </button>
                ))}
              </div>
              {authenticated && (
                <div className="community-actions">
                  <button
                    onClick={() => {
                      setEditing({
                        ...photo,
                        tags: photo.tags.map((t) => ({ ...t })),
                      });
                      setTagId("");
                    }}
                  >
                    Chỉnh sửa / gắn tên
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Xóa ảnh khỏi album?"))
                        void run(() =>
                          act({
                            action: "delete",
                            collection: "photos",
                            id: photo.id,
                          }),
                        );
                    }}
                  >
                    Xóa ảnh
                  </button>
                </div>
              )}
            </article>
          ))}
      </div>
      {!photos.some(
        (p) =>
          (!filter || p.tags.some((t) => t.memberId === filter)) &&
          (!eventId || p.eventId === eventId),
      ) && (
        <Empty>
          Chưa có ảnh phù hợp. Thêm ảnh họp họ đầu tiên và gắn tên từng người.
        </Empty>
      )}
    </div>
  );
}
