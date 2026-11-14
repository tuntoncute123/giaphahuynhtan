"use client";
import { useState } from "react";
import type { Member } from "@/lib/types";
import { generationOf } from "@/lib/family";
import { lineagePath } from "@/lib/community/model";
import { MemberSelect } from "./shared";
export default function MyLineage({
  members,
  selfId,
  onSelf,
  openPerson,
}: {
  members: Member[];
  selfId: string;
  onSelf: (id: string) => void;
  openPerson: (id: string) => void;
}) {
  const [side, setSide] = useState<"father" | "mother">("father");
  const self = members.find((m) => m.id === selfId);
  const path = lineagePath(selfId, members, side);
  return (
    <section className="community-self community-card container">
      <div>
        <span className="section-kicker">TÔI TRONG DÒNG HỌ</span>
        <h2>Từ tổ tiên đến mình</h2>
        <p>
          Chọn hồ sơ của bạn để xem đường nối qua các thế hệ và tự tra cách xưng
          hô khi mở hồ sơ bà con.
        </p>
      </div>
      <MemberSelect
        members={members}
        value={selfId}
        onChange={onSelf}
        label="Hồ sơ của tôi"
        optional
      />
      {self && (
        <>
          <div className="community-actions">
            <strong>
              {self.fullName} · Đời thứ {generationOf(self.id, members)}
            </strong>
            <label>
              Đường phả hệ
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as typeof side)}
              >
                <option value="father">Theo cha qua từng đời</option>
                <option value="mother">Theo mẹ qua từng đời</option>
              </select>
            </label>
          </div>
          {path.length > 1 ? (
            <>
              <p>
                Nhánh dẫn từ <strong>{path[0].fullName}</strong> theo dữ liệu
                hiện có.
              </p>
              <ol className="community-lineage">
                {path.map((m, i) => (
                  <li key={m.id} className={m.id === selfId ? "is-self" : ""}>
                    <span>{i ? "↓" : "●"}</span>
                    <button onClick={() => openPerson(m.id)}>
                      <strong>{m.fullName}</strong>
                      <small>
                        Đời {generationOf(m.id, members)}
                        {m.id === selfId ? " · Tôi" : ""}
                      </small>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p>
              Chưa có dữ liệu nối tiếp ở phía {side === "father" ? "cha" : "mẹ"}
              . Gia đình có thể bổ sung qua mục Góp thông tin.
            </p>
          )}
          <p className="community-note">
            Các tổ tiên đã ghi nhận ở cả hai phía được tô màu trong cây bên
            dưới. Lựa chọn của bạn được lưu trên thiết bị này, không cấp quyền
            chỉnh sửa.
          </p>
        </>
      )}
    </section>
  );
}
