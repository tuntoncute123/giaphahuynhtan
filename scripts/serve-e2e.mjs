import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
const directory = await mkdtemp(path.join(os.tmpdir(), "huynh-tan-e2e-"));
const base = {
  aliases: [],
  birthOrder: null,
  gender: "Nam",
  birthDate: "",
  deathDate: "",
  anniversary: null,
  birthPlace: "",
  currentPlace: "",
  home: { address: "", latitude: null, longitude: null },
  homePublic: false,
  zaloPhone: "",
  zaloConsent: false,
  occupation: "",
  biography: "",
  fatherId: null,
  motherId: null,
  spouseIds: [],
  avatar: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const data = {
  members: [
    {
      ...base,
      id: "root",
      fullName: "Huỳnh Tấn Tổ",
      deathDate: "2000-01-01",
      spouseIds: ["mother"],
    },
    {
      ...base,
      id: "mother",
      fullName: "Nguyễn Thị Mẹ",
      gender: "Nữ",
      spouseIds: ["root"],
      home: { address: "Địa chỉ riêng tư", latitude: 10, longitude: 106 },
      zaloPhone: "84901234567",
    },
    {
      ...base,
      id: "child",
      fullName: "Huỳnh Tấn Con",
      fatherId: "root",
      motherId: "mother",
      biography: "Tiểu sử ban đầu",
    },
  ],
  content: [
    {
      id: "event",
      kind: "event",
      title: "Giỗ tổ thử nghiệm",
      description: "Cùng trở về họp mặt",
      date: "2099-01-01",
      location: "Nhà thờ họ",
      fileUrl: "",
      createdAt: "",
    },
  ],
  shrines: [],
  reminders: [],
  reminderLogs: [],
  updatedAt: "",
};
const file = path.join(directory, "family.json");
await writeFile(file, JSON.stringify(data));
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      FAMILY_DATA_FILE: file,
      DATABASE_URL: "",
      VERCEL: "",
      BLOB_READ_WRITE_TOKEN: "",
      BLOB_STORE_ID: "",
      VERCEL_OIDC_TOKEN: "",
      ADMIN_USERNAME: "e2e-admin",
      ADMIN_PASSWORD: "e2e-local-password",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", async (code) => {
  // Remove only assets referenced by this isolated test fixture.
  try {
    const snapshot = await readFile(file, "utf8");
    const filenames = [...new Set([...snapshot.matchAll(/\/api\/files\/([0-9a-f-]{36}\.(?:jpg|png|webp|pdf|webm|ogg|mp3|m4a|wav))/g)].map(match => match[1]))];
    await Promise.all(filenames.map(filename => rm(path.join(process.cwd(), "public", "uploads", filename), { force: true })));
  } catch { /* A failed run may not have saved its fixture yet. */ }
  await rm(directory, { recursive: true, force: true });
  process.exit(code || 0);
});
