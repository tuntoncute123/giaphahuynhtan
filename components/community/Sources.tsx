"use client";
import { useState } from "react";
import type { ContributionField, SourceCitation } from "@/lib/types";
import { communityOf, fieldLabels, fieldValue } from "@/lib/community/model";
import {
  AdminGate,
  Empty,
  MemberSelect,
  UploadField,
  useSubmit,
  type CommunityProps,
} from "./shared";
const blank = (
  memberId = "",
): Omit<SourceCitation, "id" | "createdAt"> & { id?: string } => ({
  memberId,
  field: "biography",
  title: "",
  url: "",
  page: "",
  excerpt: "",
  status: "unverified",
});
export default function Sources(
  props: CommunityProps & { initialMemberId: string },
) {
  const { data, authenticated, act, openPerson, initialMemberId } = props;
  const [filter, setFilter] = useState(initialMemberId);
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<ReturnType<typeof blank> | null>(null);
  const { busy, run, feedback } = useSubmit();
  const sources = communityOf(data).sources.filter(
    (s) =>
      (!filter || s.memberId === filter) &&
      (status === "all" || s.status === status),
  );
  return (
    <div className="community-stack">
      <div>
        <h2>Đối chiếu tư liệu gốc</h2>
        <p>
          Gắn từng thông tin với trang sách, ảnh tài liệu hoặc bản chép. Khi hồ
          sơ thay đổi, căn cứ liên quan tự chuyển về “Cần đối chiếu”.
        </p>
      </div>
      {feedback}
      <div className="community-grid two">
        <MemberSelect
          members={data.members}
          value={filter}
          onChange={setFilter}
          optional
          label="Người cần đối chiếu"
        />
        <label>
          Trạng thái
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="unverified">Cần đối chiếu</option>
            <option value="verified">Đã xác minh</option>
          </select>
        </label>
      </div>
      <AdminGate {...props}>
        <button
          className="primary-btn"
          onClick={() => setEditing(blank(filter))}
        >
          Thêm căn cứ tư liệu
        </button>
      </AdminGate>
      {editing && authenticated && (
        <form
          className="community-card community-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await act({ action: "source", ...editing });
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
            Thông tin được chứng minh
            <select
              value={editing.field}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  field: e.target.value as ContributionField,
                })
              }
            >
              {Object.entries(fieldLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tên tư liệu
            <input
              required
              maxLength={300}
              value={editing.title}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value })
              }
              placeholder="Tân Gia phả chung 2023"
            />
          </label>
          <div className="community-grid two">
            <label>
              Trang / đoạn
              <input
                required
                maxLength={80}
                value={editing.page}
                onChange={(e) =>
                  setEditing({ ...editing, page: e.target.value })
                }
                placeholder="Trang 12, đoạn 3"
              />
            </label>
            <label>
              Trạng thái
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    status: e.target.value as SourceCitation["status"],
                  })
                }
              >
                <option value="unverified">Cần đối chiếu</option>
                <option value="verified">Đã xác minh</option>
              </select>
            </label>
          </div>
          <UploadField
            label="Ảnh trang sách hoặc PDF"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            value={editing.url}
            onChange={(url) => setEditing({ ...editing, url })}
          />
          <label>
            Hoặc liên kết tư liệu
            <input
              type="text"
              maxLength={2000}
              value={editing.url}
              onChange={(e) => setEditing({ ...editing, url: e.target.value })}
              placeholder="https://… (có thể để trống với bản giấy)"
            />
          </label>
          <label>
            Trích dẫn và ghi chú đối chiếu
            <textarea
              required
              maxLength={10000}
              rows={5}
              value={editing.excerpt}
              onChange={(e) =>
                setEditing({ ...editing, excerpt: e.target.value })
              }
            />
          </label>
          <div className="community-actions">
            <button className="primary-btn" disabled={busy}>
              Lưu căn cứ
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
      {!sources.length && (
        <Empty>
          Chưa có căn cứ phù hợp. Các mục chưa có căn cứ vẫn cần được gia đình
          đối chiếu.
        </Empty>
      )}
      {sources.map((source) => {
        const member = data.members.find((m) => m.id === source.memberId);
        return (
          <article key={source.id} className="community-card community-stack">
            <div className="community-actions">
              <h3>{source.title}</h3>
              <span className={`community-status ${source.status}`}>
                {source.status === "verified" ? "Đã xác minh" : "Cần đối chiếu"}
              </span>
            </div>
            <p>
              Trang / đoạn: {source.page} ·{" "}
              <button onClick={() => openPerson(source.memberId)}>
                {member?.fullName}
              </button>
            </p>
            <div className="community-grid two">
              <div className="community-proposal-field">
                <h4>Trong hồ sơ · {fieldLabels[source.field]}</h4>
                <p className="community-prewrap">
                  {member
                    ? fieldValue(
                        member[source.field],
                        source.field,
                        data.members,
                      )
                    : "Hồ sơ đã xóa"}
                </p>
              </div>
              <div className="community-proposal-field">
                <h4>Căn cứ trong tư liệu</h4>
                <blockquote className="community-prewrap">
                  {source.excerpt}
                </blockquote>
                {source.url && (
                  <a
                    href={
                      /\.pdf$/i.test(source.url) && /^\d+$/.test(source.page)
                        ? `${source.url}#page=${source.page}`
                        : source.url
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Mở trang / tài liệu gốc
                  </a>
                )}
              </div>
            </div>
            {source.url && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(source.url) && (
              <a href={source.url} target="_blank" rel="noreferrer">
                <img
                  className="community-source-image"
                  src={source.url}
                  alt={`${source.title}, trang ${source.page}`}
                  loading="lazy"
                />
              </a>
            )}
            {authenticated && (
              <div className="community-actions">
                <button onClick={() => setEditing({ ...source })}>
                  Chỉnh sửa / xác minh
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Xóa căn cứ tư liệu này?"))
                      void run(() =>
                        act({
                          action: "delete",
                          collection: "sources",
                          id: source.id,
                        }),
                      );
                  }}
                >
                  Xóa
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
