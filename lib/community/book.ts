import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { FamilyData, Member } from "../types";
import { fullDate, generationOf } from "../family";
import { anniversaryLabel } from "../lunar";
import { bookMembers, communityOf, fieldLabels } from "./model";

export async function createFamilyBook(
  data: FamilyData,
  rootId: string,
  includePhotos: boolean,
  progress: (value: string) => void,
) {
  const members = bookMembers(data.members, rootId);
  if (!members.length) throw new Error("Không có thành viên để xuất sách.");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontResponse = await fetch("/fonts/dejavu/DejaVuSans.ttf");
  if (!fontResponse.ok) throw new Error("Không tải được phông chữ tiếng Việt.");
  const font = await doc.embedFont(await fontResponse.arrayBuffer(), {
    subset: true,
  });
  doc.setTitle("Gia phả Huỳnh Tấn");
  doc.setLanguage("vi-VN");
  doc.setAuthor("Dòng họ Huỳnh Tấn");
  const width = 595.28,
    height = 841.89,
    margin = 48;
  const ink = rgb(0.18, 0.18, 0.16),
    accent = rgb(0.45, 0.18, 0.12);
  const allowedGlyphs = new Set(font.getCharacterSet());
  const clean = (value: string) =>
    Array.from(value.normalize("NFC"))
      .filter(
        (c) =>
          c === "\n" ||
          (c.codePointAt(0)! >= 32 && allowedGlyphs.has(c.codePointAt(0)!)),
      )
      .join("");
  const lines = (value: string, size = 10, maxWidth = width - margin * 2) => {
    const result: string[] = [];
    for (const paragraph of clean(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (
          font.widthOfTextAtSize(`${line} ${word}`.trim(), size) > maxWidth &&
          line
        ) {
          result.push(line);
          line = "";
        }
        // Long URLs and unbroken text must not run outside the page.
        for (const char of (line ? " " : "") + word) {
          if (font.widthOfTextAtSize(line + char, size) > maxWidth && line) {
            result.push(line);
            line = "";
          }
          line += char;
        }
      }
      result.push(line);
    }
    return result;
  };
  const draw = (
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    size = 10,
    color = ink,
  ) => page.drawText(clean(text), { x, y, font, size, color });
  const nameOf = (id: string | null) =>
    data.members.find((m) => m.id === id)?.fullName || "Chưa ghi nhận";
  const cover = doc.addPage([width, height]);
  draw(cover, "GIA PHẢ HUỲNH TẤN", margin, 680, 25, accent);
  const root = data.members.find((m) => m.id === rootId);
  lines(root ? `Nhánh ${root.fullName}` : "Toàn bộ dòng họ", 16).forEach(
    (line, i) => draw(cover, line, margin, 630 - i * 23, 16),
  );
  draw(cover, `${members.length} hồ sơ • Khổ A4`, margin, 550, 12);
  draw(
    cover,
    `Biên xuất ngày ${new Date().toLocaleDateString("vi-VN")}`,
    margin,
    520,
    11,
  );
  lines(
    "Gìn giữ cội nguồn, kết nối hôm nay và trao truyền cho mai sau. Thông tin chưa đầy đủ được giữ nguyên để gia đình tiếp tục đối chiếu.",
  ).forEach((line, i) => draw(cover, line, margin, 430 - i * 17));
  const tocPages = Array.from({ length: Math.ceil(members.length / 30) }, () =>
    doc.addPage([width, height]),
  );
  // A paginated, indented pedigree with explicit parents remains readable for large families.
  const chosen = new Set(members.map((m) => m.id));
  const seen = new Set<string>();
  const ordered: { member: Member; depth: number }[] = [];
  const visit = (member: Member, depth: number) => {
    if (seen.has(member.id)) return;
    seen.add(member.id);
    ordered.push({ member, depth });
    members
      .filter(
        (m) =>
          (m.fatherId && chosen.has(m.fatherId) ? m.fatherId : m.motherId) ===
          member.id,
      )
      .forEach((m) => visit(m, depth + 1));
  };
  members
    .filter(
      (m) => !chosen.has(m.fatherId || "") && !chosen.has(m.motherId || ""),
    )
    .forEach((m) => visit(m, 0));
  members.forEach((m) => visit(m, 0));
  let tree: PDFPage | null = null;
  for (let index = 0; index < ordered.length; index++) {
    if (index % 19 === 0) {
      tree = doc.addPage([width, height]);
      draw(tree, "SƠ ĐỒ PHẢ HỆ", margin, 790, 16, accent);
      draw(
        tree,
        "Thụt lề theo nhánh; cha và mẹ ghi dưới mỗi người.",
        margin,
        766,
        9,
      );
    }
    const { member, depth } = ordered[index];
    const x = margin + Math.min(depth, 8) * 12;
    const y = 730 - (index % 19) * 34;
    if (depth) {
      tree!.drawLine({
        start: { x: x - 7, y: y + 12 },
        end: { x: x - 7, y: y - 1 },
        color: accent,
        thickness: 0.6,
      });
      tree!.drawLine({
        start: { x: x - 7, y: y - 1 },
        end: { x: x - 2, y: y - 1 },
        color: accent,
        thickness: 0.6,
      });
    }
    draw(
      tree!,
      lines(
        `${member.fullName} · Đời ${generationOf(member.id, data.members)}`,
        10,
        width - x - margin,
      )[0],
      x,
      y,
    );
    draw(
      tree!,
      lines(
        `Cha: ${nameOf(member.fatherId)} · Mẹ: ${nameOf(member.motherId)}`,
        8,
        width - x - margin,
      )[0],
      x,
      y - 13,
      8,
    );
  }
  const entries: { member: Member; page: number }[] = [];
  let missingPhotos = 0;
  for (let index = 0; index < members.length; index++) {
    const m = members[index];
    progress(`Đang biên soạn ${index + 1}/${members.length}: ${m.fullName}`);
    let page = doc.addPage([width, height]);
    entries.push({ member: m, page: doc.getPageCount() });
    let y = 790;
    const write = (value: string, size = 10) => {
      for (const line of lines(value, size)) {
        if (y < 66) {
          page = doc.addPage([width, height]);
          draw(page, `${m.fullName} (tiếp)`, margin, 797, 10, accent);
          y = 770;
        }
        draw(page, line, margin, y, size);
        y -= size * 1.5;
      }
      y -= 7;
    };
    write(m.fullName, 18);
    write(`Đời thứ ${generationOf(m.id, data.members)} · ${m.gender}`);
    if (includePhotos && m.avatar) {
      try {
        // Fetch only local uploaded assets; do not leak requests to third-party photo hosts.
        if (!/^\/(api\/files|uploads)\/[\w.-]+$/.test(m.avatar))
          throw new Error("External image");
        const response = await fetch(m.avatar);
        if (!response.ok) throw new Error("Image unavailable");
        const bitmap = await createImageBitmap(await response.blob());
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        canvas
          .getContext("2d")!
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const image = await doc.embedPng(canvas.toDataURL("image/png"));
        const dimensions = image.scaleToFit(130, 130);
        page.drawImage(image, {
          x: margin,
          y: y - dimensions.height,
          ...dimensions,
        });
        y -= dimensions.height + 15;
      } catch {
        missingPhotos++;
        write("Ảnh đại diện không tải được khi biên xuất.", 9);
      }
    }
    if (m.aliases.length) write(`Tên thường gọi: ${m.aliases.join(", ")}`);
    write(
      `Ngày sinh: ${fullDate(m.birthDate)}\nNgày mất: ${m.deathDate ? fullDate(m.deathDate) : "Chưa ghi nhận"}${m.anniversary ? `\nNgày giỗ: ${anniversaryLabel(m.anniversary)}` : ""}`,
    );
    write(
      `Cha: ${nameOf(m.fatherId)}\nMẹ: ${nameOf(m.motherId)}\nPhối ngẫu: ${m.spouseIds.map(nameOf).join(", ") || "Chưa ghi nhận"}`,
    );
    const children = data.members.filter(
      (c) => c.fatherId === m.id || c.motherId === m.id,
    );
    if (children.length)
      write(`Các con: ${children.map((c) => c.fullName).join("; ")}`);
    write(
      `Quê quán: ${m.birthPlace || "Chưa ghi nhận"}\nNghề nghiệp: ${m.occupation || "Chưa ghi nhận"}`,
    );
    if (m.biography) {
      write("TIỂU SỬ", 12);
      write(m.biography);
    }
    const sources = communityOf(data).sources.filter(
      (s) => s.memberId === m.id,
    );
    if (sources.length) {
      write("TƯ LIỆU ĐỐI CHIẾU", 12);
      for (const source of sources)
        write(
          `${fieldLabels[source.field]}: ${source.title}, trang/đoạn ${source.page} (${source.status === "verified" ? "đã xác minh" : "cần đối chiếu"}).\n${source.excerpt}`,
        );
    }
    if (index % 10 === 0)
      await new Promise((resolve) => setTimeout(resolve, 0));
  }
  entries.forEach((entry, index) => {
    const page = tocPages[Math.floor(index / 30)];
    const row = index % 30;
    if (!row) draw(page, "MỤC LỤC HỒ SƠ", margin, 790, 16, accent);
    draw(
      page,
      lines(entry.member.fullName, 10, 420)[0],
      margin,
      750 - row * 22,
    );
    draw(page, String(entry.page), width - margin - 30, 750 - row * 22);
  });
  for (const [index, page] of doc.getPages().entries()) {
    page.drawLine({
      start: { x: margin, y: 43 },
      end: { x: width - margin, y: 43 },
      color: rgb(0.8, 0.8, 0.8),
      thickness: 0.5,
    });
    draw(
      page,
      `Gia phả Huỳnh Tấn · ${index + 1} / ${doc.getPageCount()}`,
      margin,
      28,
      8,
    );
  }
  progress("Đang đóng gói PDF...");
  return { bytes: await doc.save(), missingPhotos, pages: doc.getPageCount() };
}
