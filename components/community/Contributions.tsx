"use client";
import { useState } from "react";
import type { ContributionField, MemberPatch } from "@/lib/types";
import { communityOf, fieldLabels, fieldValue } from "@/lib/community/model";
import {
  Empty,
  MemberSelect,
  UploadField,
  useSubmit,
  type CommunityProps,
} from "./shared";
export default function Contributions(
  props: CommunityProps & { initialMemberId: string },
) {
  const { data, authenticated, act, initialMemberId } = props;
  const [memberId, setMemberId] = useState(initialMemberId);
  const [author, setAuthor] = useState("");
  const [reason, setReason] = useState("");
  const [patch, setPatch] = useState<MemberPatch>({});
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { busy, run, feedback } = useSubmit();
  const member = data.members.find((m) => m.id === memberId);
  const community = communityOf(data);
  const setField = (field: ContributionField, value: unknown) =>
    setPatch((current) => ({ ...current, [field]: value }));
  return (
    <div className="community-stack">
      <div>
        <h2>Cùng bổ sung gia phả</h2>
        <p>
          Gửi thông tin cùng căn cứ để ban quản trị đối chiếu. Hồ sơ chỉ thay
          đổi sau khi được duyệt.
        </p>
      </div>
      {feedback}
      <form
        className="community-card community-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await act({
              action: "contribute",
              memberId,
              author,
              reason,
              patch,
            });
            setPatch({});
            setReason("");
          }, "Đã gửi đề nghị. Ban quản trị sẽ xem xét trước khi cập nhật gia phả.");
        }}
      >
        <MemberSelect
          members={data.members}
          value={memberId}
          onChange={(id) => {
            setMemberId(id);
            setPatch({});
          }}
        />
        <div className="community-grid two">
          <label>
            Tên người góp thông tin
            <input
              required
              maxLength={120}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </label>
          <label>
            Thêm mục cần sửa
            <select
              value=""
              disabled={!member}
              onChange={(e) => {
                const field = e.target.value as ContributionField;
                if (field && member) setField(field, member[field]);
              }}
            >
              <option value="">Chọn thông tin</option>
              {Object.entries(fieldLabels)
                .filter(([key]) => !(key in patch))
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {member &&
          (Object.keys(patch) as ContributionField[]).map((field) => (
            <div key={field} className="community-proposal-field">
              <div className="community-actions">
                <strong>{fieldLabels[field]}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setPatch((current) => {
                      const next = { ...current };
                      delete next[field];
                      return next;
                    })
                  }
                >
                  Bỏ mục này
                </button>
              </div>
              <p className="community-note">
                Hiện tại: {fieldValue(member[field], field, data.members)}
              </p>
              {field === "fatherId" || field === "motherId" ? (
                <MemberSelect
                  members={data.members.filter((m) => m.id !== member.id)}
                  value={String(patch[field] || "")}
                  onChange={(id) => setField(field, id || null)}
                  label={`${fieldLabels[field]} đề nghị`}
                  optional
                />
              ) : field === "spouseIds" ? (
                <>
                  <MemberSelect
                    members={data.members.filter((m) => m.id !== member.id)}
                    value=""
                    onChange={(id) => {
                      if (id)
                        setField(field, [
                          ...new Set([...(patch.spouseIds || []), id]),
                        ]);
                    }}
                    label="Thêm phối ngẫu"
                    optional
                  />
                  <div className="community-chips">
                    {(patch.spouseIds || []).map((id) => (
                      <button
                        type="button"
                        key={id}
                        onClick={() =>
                          setField(
                            field,
                            patch.spouseIds?.filter((value) => value !== id),
                          )
                        }
                      >
                        {data.members.find((m) => m.id === id)?.fullName} ×
                      </button>
                    ))}
                  </div>
                </>
              ) : field === "avatar" ? (
                <>
                  <UploadField
                    label="Ảnh đại diện đề nghị"
                    value={patch.avatar || ""}
                    onChange={(url) => setField(field, url)}
                  />
                  {patch.avatar && (
                    <img
                      className="community-avatar-preview"
                      src={patch.avatar}
                      alt="Ảnh đề nghị"
                    />
                  )}
                </>
              ) : field === "biography" ? (
                <label>
                  Tiểu sử đề nghị
                  <textarea
                    rows={5}
                    value={String(patch[field] || "")}
                    maxLength={20000}
                    onChange={(e) => setField(field, e.target.value)}
                  />
                </label>
              ) : (
                <label>
                  {fieldLabels[field]} đề nghị
                  <input
                    type={field.endsWith("Date") ? "date" : "text"}
                    required={field === "fullName"}
                    maxLength={1000}
                    value={String(patch[field] || "")}
                    onChange={(e) => setField(field, e.target.value)}
                  />
                </label>
              )}
            </div>
          ))}
        <label>
          Lý do và căn cứ
          <textarea
            required
            maxLength={2000}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: ngày sinh ghi trên giấy khai sinh; bản gia phả trang 12…"
          />
        </label>
        <button
          className="primary-btn"
          disabled={busy || !member || !Object.keys(patch).length}
        >
          Gửi đề nghị để duyệt
        </button>
      </form>
      {authenticated && (
        <>
          <div className="community-actions">
            <h3>Hộp thư góp ý</h3>
            <label>
              Trạng thái
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">Đang chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Đã từ chối</option>
                <option value="all">Tất cả</option>
              </select>
            </label>
          </div>
          {!community.contributions.some(
            (c) => status === "all" || c.status === status,
          ) && <Empty>Không có đề nghị trong nhóm này.</Empty>}
          {community.contributions
            .filter((c) => status === "all" || c.status === status)
            .map((c) => (
              <article className="community-card community-stack" key={c.id}>
                <h4>
                  {data.members.find((m) => m.id === c.memberId)?.fullName ||
                    "Hồ sơ đã xóa"}{" "}
                  · {c.author}
                </h4>
                <p>{c.reason}</p>
                <small>{new Date(c.createdAt).toLocaleString("vi-VN")}</small>
                <div className="community-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Thông tin</th>
                        <th>Trước khi góp ý</th>
                        <th>Đề nghị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.keys(c.patch) as ContributionField[]).map(
                        (field) => (
                          <tr key={field}>
                            <th>{fieldLabels[field]}</th>
                            <td>
                              {fieldValue(c.before[field], field, data.members)}
                            </td>
                            <td>
                              {field === "avatar" && c.patch.avatar ? (
                                <img
                                  className="community-avatar-preview"
                                  src={c.patch.avatar}
                                  alt="Ảnh đề nghị"
                                />
                              ) : (
                                fieldValue(c.patch[field], field, data.members)
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
                {c.status === "pending" ? (
                  <>
                    <label>
                      Ghi chú duyệt
                      <input
                        maxLength={2000}
                        value={notes[c.id] || ""}
                        onChange={(e) =>
                          setNotes({ ...notes, [c.id]: e.target.value })
                        }
                      />
                    </label>
                    <div className="community-actions">
                      <button
                        className="primary-btn"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            act({
                              action: "review",
                              id: c.id,
                              decision: "approved",
                              reviewNote: notes[c.id] || "",
                            }),
                          )
                        }
                      >
                        Duyệt cập nhật
                      </button>
                      <button
                        className="outline-btn"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            act({
                              action: "review",
                              id: c.id,
                              decision: "rejected",
                              reviewNote: notes[c.id] || "",
                            }),
                          )
                        }
                      >
                        Từ chối
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="community-note">
                    {c.status === "approved" ? "Đã duyệt" : "Đã từ chối"} ·{" "}
                    {c.reviewNote || "Không có ghi chú"}
                  </p>
                )}
              </article>
            ))}
          <h3>Lịch sử chỉnh sửa và khôi phục</h3>
          <p className="community-note">
            Chọn thành viên ở trên để xem lịch sử. Khôi phục chỉ đảo lại các mục
            đã thay đổi trong phiên bản đó; hệ thống sẽ chặn nếu có thay đổi mới
            xung đột.
          </p>
          {community.revisions
            .filter((r) => !memberId || r.memberId === memberId)
            .map((r) => (
              <details className="community-card" key={r.id}>
                <summary>
                  {r.after.fullName} ·{" "}
                  {new Date(r.createdAt).toLocaleString("vi-VN")} · {r.reason}
                </summary>
                <div className="community-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Mục</th>
                        <th>Trước</th>
                        <th>Sau</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(r.after)
                        .filter(
                          (key) =>
                            JSON.stringify(
                              r.before[key as keyof typeof r.before],
                            ) !==
                            JSON.stringify(
                              r.after[key as keyof typeof r.after],
                            ),
                        )
                        .map((key) => (
                          <tr key={key}>
                            <th>
                              {fieldLabels[key as ContributionField] || key}
                            </th>
                            <td>
                              {fieldValue(
                                r.before[key as keyof typeof r.before],
                                key,
                                data.members,
                              )}
                            </td>
                            <td>
                              {fieldValue(
                                r.after[key as keyof typeof r.after],
                                key,
                                data.members,
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="outline-btn"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "Khôi phục các mục trong phiên bản này về giá trị trước khi sửa?",
                      )
                    )
                      void run(() => act({ action: "restore", id: r.id }));
                  }}
                >
                  Khôi phục thay đổi này
                </button>
              </details>
            ))}
          {!community.revisions.some(
            (r) => !memberId || r.memberId === memberId,
          ) && <Empty>Chưa có lịch sử chỉnh sửa cho lựa chọn này.</Empty>}
        </>
      )}
    </div>
  );
}
