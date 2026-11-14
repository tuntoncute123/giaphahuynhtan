import { test, expect, type Page } from "@playwright/test";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { readFile } from "node:fs/promises";

const login = async (page: Page) => {
  const response = await page.request.post("/api/auth", {
    data: { username: "e2e-admin", password: "e2e-local-password" },
  });
  expect(response.ok()).toBeTruthy();
  await page.reload({ waitUntil: "domcontentloaded" });
};
async function open(page: Page, tab: string) {
  await page.goto(`/#community/${tab}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".community-panel")).toBeVisible();
}
test("eight features persist and work together on desktop and mobile", async ({
  page,
  browser,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://**/*", (route) => route.abort());
  await page.goto("/#tree", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("combobox", { name: "Hồ sơ của tôi", exact: true })
    .selectOption("child");
  await expect(page.locator(".community-lineage")).toContainText(
    "Huỳnh Tấn Tổ",
  );
  await expect(page.locator(".lineage-highlight").first()).toBeVisible();
  await page
    .locator(".community-lineage")
    .getByRole("button", { name: "Huỳnh Tấn Tổ", exact: false })
    .click();
  await expect(page.locator(".community-relation")).toContainText(
    "Bạn gọi Huỳnh Tấn Tổ là:",
  );
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("combobox", { name: "Hồ sơ của tôi", exact: true }),
  ).toHaveValue("child");

  // Public submissions never directly edit a profile.
  await open(page, "contributions");
  await page
    .getByRole("combobox", { name: "Thành viên", exact: true })
    .selectOption("child");
  await page.getByLabel("Tên người góp thông tin").fill("Con cháu E2E");
  await page
    .getByRole("combobox", { name: "Thêm mục cần sửa" })
    .selectOption("biography");
  await page
    .getByLabel("Tiểu sử đề nghị")
    .fill("Ký ức của dòng họ được lưu lại.");
  await page
    .getByLabel("Lý do và căn cứ")
    .fill("Đối chiếu bản gia phả trang 12.");
  await page.getByRole("button", { name: "Gửi đề nghị để duyệt" }).click();
  await expect(page.getByRole("status")).toContainText("Đã gửi đề nghị");
  let result = await (await page.request.get("/api/family")).json();
  expect(
    result.members.find((m: { id: string }) => m.id === "child").biography,
  ).toBe("Tiểu sử ban đầu");
  expect(result.community.contributions).toEqual([]);
  expect(
    (
      await page.request.post("/api/community", { data: { action: "review" } })
    ).status(),
  ).toBe(401);

  await login(page);
  await open(page, "contributions");
  await expect(page.getByText("Hộp thư góp ý", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Duyệt cập nhật", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Đã lưu thay đổi");
  result = await (await page.request.get("/api/family")).json();
  expect(
    result.members.find((m: { id: string }) => m.id === "child").biography,
  ).toContain("Ký ức");
  await page.locator("details").first().locator("summary").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Khôi phục thay đổi này" })
    .first()
    .click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/family")).json()).members.find(
          (m: { id: string }) => m.id === "child",
        ).biography,
    )
    .toBe("Tiểu sử ban đầu");

  await open(page, "album");
  await page.getByRole("button", { name: "Thêm ảnh & gắn tên" }).click();
  await page.getByLabel("Tên ảnh", { exact: true }).fill("Ảnh họp họ E2E");
  const png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#eadcbe";
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = "#6b8b69";
      ctx.fillRect(90, 160, 120, 150);
      ctx.fillStyle = "#987043";
      ctx.fillRect(260, 160, 120, 150);
      ctx.fillStyle = "#aa6c66";
      ctx.fillRect(430, 160, 120, 150);
      ctx.fillStyle = "#604838";
      ctx.font = "24px sans-serif";
      ctx.fillText("Ảnh gia đình · dữ liệu thử", 160, 65);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: "family.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("Mở tệp đã chọn")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Người cần gắn tên", exact: true })
    .selectOption("child");
  await page
    .getByRole("button", { name: "Đặt tên đã chọn ở giữa ảnh" })
    .click();
  await page
    .getByRole("combobox", { name: "Sự kiện liên quan" })
    .last()
    .selectOption("event");
  await page.getByRole("button", { name: "Lưu ảnh", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ảnh họp họ E2E" }),
  ).toBeVisible();
  await page.locator("button.photo-pin").click();
  await expect(page.getByRole("dialog")).toContainText("Huỳnh Tấn Con");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();

  await open(page, "memories");
  await page.getByRole("button", { name: "Lưu một ký ức mới" }).click();
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Chuyện của bà");
  await page.getByLabel("Người kể", { exact: true }).fill("Bà");
  await page.getByRole("button", { name: "Bắt đầu ghi âm" }).click();
  await expect(page.getByText("● Đang ghi âm", { exact: true })).toBeVisible();
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /Dừng ghi/ }).click();
  await expect(page.locator(".community-recorder audio")).toBeVisible();
  await page.getByRole("button", { name: "Dùng bản ghi này" }).click();
  await expect(page.getByText("Mở tệp đã chọn")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Gắn nhân vật", exact: true })
    .selectOption("child");
  await page.getByLabel("Người kể đồng ý lưu").check();
  await page.getByRole("button", { name: "Lưu ký ức", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chuyện của bà" }),
  ).toBeVisible();
  const audioUrl = await page.locator("article audio").getAttribute("src");
  const audio = await page.request.get(audioUrl!);
  expect(audio.ok()).toBeTruthy();
  expect(audio.headers()["content-type"]).toContain("audio/");
  const range = await page.request.get(audioUrl!, {
    headers: { Range: "bytes=0-15" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(16);

  await open(page, "gatherings");
  await page.getByLabel("Tên người đại diện").fill("Nhà Hai");
  await page.getByLabel("Số người đi cùng").fill("2");
  await page
    .getByRole("button", { name: "Đăng ký tham dự", exact: true })
    .click();
  await expect(
    page.getByText("3 người dự kiến", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Công việc mới").fill("Chuẩn bị lễ vật");
  await page
    .getByRole("combobox", { name: "Người phụ trách", exact: true })
    .selectOption("child");
  await page.getByRole("button", { name: "Thêm công việc" }).click();
  await expect(page.locator(".community-task")).toContainText(
    "Chuẩn bị lễ vật",
  );
  await page.locator(".community-task input").click();
  await expect(page.locator(".community-task input")).toBeChecked();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".community-task input")).toBeChecked();
  await expect(page.getByLabel("Tên người đại diện")).toHaveValue("Nhà Hai");
  await expect(page.locator(".community-thumbnails img")).toHaveCount(1);

  await open(page, "graves");
  await page.getByRole("button", { name: "Thêm phần mộ" }).click();
  await page
    .getByRole("combobox", { name: "Thành viên", exact: true })
    .selectOption("root");
  await page
    .getByLabel("Nghĩa trang / khu mộ", { exact: true })
    .fill("Khu mộ tổ");
  await page.getByLabel("Địa chỉ", { exact: true }).fill("Quảng Ngãi");
  await page.getByLabel("Vĩ độ", { exact: true }).fill("15.12");
  await page.getByLabel("Kinh độ", { exact: true }).fill("108.8");
  await page.getByLabel("Hướng dẫn lối vào").fill("Đi từ cổng đông");
  await page.getByRole("button", { name: "Lưu phần mộ", exact: true }).click();
  await expect(page.locator(".community-map")).toBeVisible();
  await page
    .getByRole("button", { name: "Thêm vào tuyến", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /Mở tuyến tảo mộ/ }),
  ).toHaveAttribute("href", /destination=15.12%2C108.8/);
  await page.getByRole("button", { name: "Ghi lần chăm sóc" }).click();
  await page.getByLabel("Người chăm sóc", { exact: true }).fill("Con cháu");
  await page.getByLabel("Nội dung", { exact: true }).fill("Dọn cỏ và thay hoa");
  await page.getByRole("button", { name: "Lưu nhật ký" }).click();
  await expect(page.locator("summary")).toContainText("Lịch sử chăm sóc (1)");

  await open(page, "sources");
  await page.getByRole("button", { name: "Thêm căn cứ tư liệu" }).click();
  await page
    .getByRole("combobox", { name: "Thành viên", exact: true })
    .selectOption("child");
  await page.getByLabel("Tên tư liệu", { exact: true }).fill("Gia phả 2023");
  await page.getByLabel("Trang / đoạn", { exact: true }).fill("12");
  await page.getByLabel("Trích dẫn và ghi chú").fill("Tiểu sử ban đầu");
  await page
    .getByRole("combobox", { name: "Trạng thái", exact: true })
    .last()
    .selectOption("verified");
  await page.getByRole("button", { name: "Lưu căn cứ", exact: true }).click();
  await expect(page.locator(".community-status")).toHaveText("Đã xác minh");

  const beforeBook = await (await page.request.get("/api/family")).json();
  expect(
    (
      await page.request.put("/api/family", {
        data: { id: "child", avatar: beforeBook.community.photos[0].imageUrl },
      })
    ).ok(),
  ).toBeTruthy();
  await page.reload({ waitUntil: "domcontentloaded" });
  await open(page, "book");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải sổ gia phả PDF" }).click();
  const download = await downloadPromise;
  const file = testInfo.outputPath("gia-pha.pdf");
  await download.saveAs(file);
  const pdf = await PDFDocument.load(await readFile(file));
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(6);
  expect(pdf.getTitle()).toBe("Gia phả Huỳnh Tấn");
  expect(pdf.context.enumerateIndirectObjects().filter(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of("Subtype"))?.toString() === "/Image").length).toBeGreaterThan(0);
  await expect(page.getByText(/Đã tạo \d+ trang/)).toBeVisible();
  await expect(page.getByText(/Có \d+ ảnh không tải được/)).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: testInfo.outputPath("desktop-book.png"),
    fullPage: true,
  });

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const phone = await mobile.newPage();
  await phone.route("https://**/*", (route) => route.abort());
  await open(phone, "album");
  await expect(
    phone.getByRole("heading", { name: "Ảnh họp họ E2E" }),
  ).toBeVisible();
  expect(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await phone.screenshot({
    path: testInfo.outputPath("mobile-album.png"),
    fullPage: true,
  });
  const publicData = await (await phone.request.get("/api/family")).json();
  expect(publicData.community.revisions).toEqual([]);
  expect(publicData.community.attendance[0].owner).toBe("");
  expect(publicData.members[1].zaloPhone).toBe("");
  await mobile.close();
  expect(errors).toEqual([]);
});
