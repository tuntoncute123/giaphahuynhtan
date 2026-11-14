"use client";
import { useState } from "react";
import type { FamilyData } from "@/lib/types";
import { bookMembers } from "@/lib/community/model";
import { MemberSelect, useSubmit } from "./shared";
export default function FamilyBook({ data }: { data: FamilyData }) {
  const [rootId, setRootId] = useState("");
  const [photos, setPhotos] = useState(true);
  const [progress, setProgress] = useState("");
  const { busy, run, feedback } = useSubmit();
  return (
    <div className="community-stack">
      <div>
        <h2>Sổ gia phả để in</h2>
        <p>
          Xuất sách PDF khổ A4, có bìa, mục lục, sơ đồ phả hệ, tiểu sử, ảnh và
          số trang. Phông chữ tiếng Việt được nhúng sẵn.
        </p>
      </div>
      {feedback}
      <div className="community-card community-stack">
        <MemberSelect
          members={data.members}
          value={rootId}
          onChange={setRootId}
          optional
          label="Gốc nhánh cần xuất"
        />
        <p>
          {rootId
            ? "Xuất người được chọn, hậu duệ và phối ngẫu của họ."
            : "Không chọn gốc nhánh để xuất toàn bộ gia phả."}{" "}
          <strong>{bookMembers(data.members, rootId).length} hồ sơ.</strong>
        </p>
        <label className="community-check">
          <input
            type="checkbox"
            checked={photos}
            onChange={(e) => setPhotos(e.target.checked)}
          />
          Kèm ảnh đại diện
        </label>
        <p className="community-note">
          Sách gồm thông tin phả hệ, không đưa số điện thoại hoặc địa chỉ nhà
          riêng vào bản in. Ảnh được lấy từ tệp đã tải lên gia phả.
        </p>
        <button
          className="primary-btn"
          disabled={busy || !data.members.length}
          onClick={() =>
            void run(async () => {
              try {
                setProgress("Đang chuẩn bị phông chữ và dữ liệu…");
                const { createFamilyBook } =
                  await import("@/lib/community/book");
                const result = await createFamilyBook(
                  data,
                  rootId,
                  photos,
                  setProgress,
                );
                const blob = new Blob([new Uint8Array(result.bytes)], {
                  type: "application/pdf",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `gia-pha-huynh-tan-${rootId ? "nhanh" : "toan-ho"}.pdf`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 60000);
                setProgress(
                  `Đã tạo ${result.pages} trang.${result.missingPhotos ? ` Có ${result.missingPhotos} ảnh không tải được; sách đã đánh dấu các hồ sơ đó.` : ""} Mở PDF để in hoặc lưu lại.`,
                );
              } catch (error) {
                setProgress("");
                throw error;
              }
            }, "Đã tạo tệp PDF.")
          }
        >
          {busy ? "Đang biên soạn…" : "Tải sổ gia phả PDF"}
        </button>
        <p role="status" aria-live="polite">
          {progress}
        </p>
      </div>
    </div>
  );
}
