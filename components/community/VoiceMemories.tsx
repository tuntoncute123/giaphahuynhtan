"use client";
import { useState } from "react";
import type { VoiceMemory } from "@/lib/types";
import { communityOf } from "@/lib/community/model";
import AudioRecorder from "./AudioRecorder";
import {
  AdminGate,
  Empty,
  EventSelect,
  MemberSelect,
  UploadField,
  useSubmit,
  type CommunityProps,
} from "./shared";
const blank = (): Omit<VoiceMemory, "id" | "createdAt"> & { id?: string } => ({
  title: "",
  narrator: "",
  description: "",
  audioUrl: "",
  imageUrls: [],
  memberIds: [],
  eventId: "",
  consent: false,
});
export default function VoiceMemories(
  props: CommunityProps & { initialMemberId: string },
) {
  const { data, authenticated, act, openPerson } = props;
  const [editing, setEditing] = useState<ReturnType<typeof blank> | null>(null);
  const [filter, setFilter] = useState(props.initialMemberId);
  const { busy, run, feedback } = useSubmit();
  const memories = communityOf(data).memories.filter(
    (m) => !filter || m.memberIds.includes(filter),
  );
  return (
    <div className="community-stack">
      <div>
        <h2>Ký ức qua giọng kể</h2>
        <p>
          Lưu lại câu chuyện, hình ảnh và giọng nói của người thân cho các thế
          hệ sau.
        </p>
      </div>
      <MemberSelect
        members={data.members}
        value={filter}
        onChange={setFilter}
        label="Nhân vật trong lời kể"
        optional
      />
      <AdminGate {...props}>
        <button className="primary-btn" onClick={() => setEditing(blank())}>
          Lưu một ký ức mới
        </button>
      </AdminGate>
      {feedback}
      {editing && authenticated && (
        <form
          className="community-card community-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await act({ action: "memory", ...editing });
              setEditing(null);
            });
          }}
        >
          <label>
            Tiêu đề
            <input
              required
              maxLength={200}
              value={editing.title}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value })
              }
            />
          </label>
          <label>
            Người kể
            <input
              required
              maxLength={120}
              value={editing.narrator}
              onChange={(e) =>
                setEditing({ ...editing, narrator: e.target.value })
              }
            />
          </label>
          <AudioRecorder
            onReady={(audioUrl) =>
              setEditing((current) =>
                current ? { ...current, audioUrl } : current,
              )
            }
          />
          <UploadField
            label="Hoặc tải bản ghi có sẵn"
            accept="audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav"
            value={editing.audioUrl}
            onChange={(audioUrl) =>
              setEditing((current) =>
                current ? { ...current, audioUrl } : current,
              )
            }
          />
          {editing.audioUrl && <audio controls src={editing.audioUrl} />}
          <label>
            Nội dung / bản chép lời
            <textarea
              rows={6}
              maxLength={20000}
              value={editing.description}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
            />
          </label>
          <MemberSelect
            members={data.members}
            value=""
            onChange={(id) => {
              if (id)
                setEditing({
                  ...editing,
                  memberIds: [...new Set([...editing.memberIds, id])],
                });
            }}
            label="Gắn nhân vật"
            optional
          />
          <div className="community-chips">
            {editing.memberIds.map((id) => (
              <button
                type="button"
                key={id}
                onClick={() =>
                  setEditing({
                    ...editing,
                    memberIds: editing.memberIds.filter((m) => m !== id),
                  })
                }
              >
                {data.members.find((m) => m.id === id)?.fullName} ×
              </button>
            ))}
          </div>
          <EventSelect
            data={data}
            value={editing.eventId}
            onChange={(eventId) => setEditing({ ...editing, eventId })}
          />
          {editing.imageUrls.length < 12 && (
            <UploadField
              label="Thêm ảnh minh họa"
              value=""
              onChange={(url) => {
                if (url)
                  setEditing((current) =>
                    current
                      ? { ...current, imageUrls: [...current.imageUrls, url] }
                      : current,
                  );
              }}
            />
          )}
          <div className="community-thumbnails">
            {editing.imageUrls.map((url, index) => (
              <div key={`${url}-${index}`}>
                <img src={url} alt={`Ảnh minh họa ${index + 1}`} />
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      imageUrls: editing.imageUrls.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                >
                  Gỡ ảnh
                </button>
              </div>
            ))}
          </div>
          <label className="community-check">
            <input
              type="checkbox"
              required
              checked={editing.consent}
              onChange={(e) =>
                setEditing({ ...editing, consent: e.target.checked })
              }
            />
            Người kể đồng ý lưu và công khai bản ghi này trên gia phả.
          </label>
          <div className="community-actions">
            <button
              className="primary-btn"
              disabled={busy || !editing.audioUrl}
            >
              Lưu ký ức
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
      {!memories.length && (
        <Empty>
          Chưa có bản ghi phù hợp. Một câu chuyện ngắn cũng là ký ức quý của gia
          đình.
        </Empty>
      )}
      <div className="community-grid two">
        {memories.map((memory) => (
          <article className="community-card community-stack" key={memory.id}>
            <div>
              <h3>{memory.title}</h3>
              <p>Giọng kể: {memory.narrator}</p>
            </div>
            <audio controls preload="none" src={memory.audioUrl} />
            <a href={memory.audioUrl} download>
              Tải bản ghi
            </a>
            <p className="community-prewrap">{memory.description}</p>
            <div className="community-thumbnails">
              {memory.imageUrls.map((url, i) => (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={url}
                    alt={`${memory.title} · ảnh ${i + 1}`}
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
            <div className="community-chips">
              {memory.memberIds.map((id) => (
                <button key={id} onClick={() => openPerson(id)}>
                  {data.members.find((m) => m.id === id)?.fullName}
                </button>
              ))}
            </div>
            {memory.eventId && (
              <p>
                Sự kiện:{" "}
                {data.content.find((e) => e.id === memory.eventId)?.title}
              </p>
            )}
            {authenticated && (
              <div className="community-actions">
                <button onClick={() => setEditing({ ...memory })}>
                  Chỉnh sửa
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Xóa ký ức này khỏi gia phả?"))
                      void run(() =>
                        act({
                          action: "delete",
                          collection: "memories",
                          id: memory.id,
                        }),
                      );
                  }}
                >
                  Xóa
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
