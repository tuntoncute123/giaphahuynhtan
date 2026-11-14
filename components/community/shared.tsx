"use client";
import { useId, useState, type ReactNode } from "react";
import type { Attendance, FamilyData, Member } from "@/lib/types";
import { matchesMember, lineageOf } from "@/lib/family";
export type CommunityProps = {
  data: FamilyData;
  authenticated: boolean;
  act: (body: Record<string, unknown>) => Promise<void>;
  openPerson: (id: string) => void;
  onLogin: () => void;
  mine: Omit<Attendance, "owner">[];
};
export function MemberSelect({
  members,
  value,
  onChange,
  label = "Thành viên",
  optional = false,
}: {
  members: Member[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  optional?: boolean;
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const filtered = members.filter(
    (m) => m.id === value || matchesMember(m, query),
  );
  return (
    <div className="community-member-select">
      <label htmlFor={`${id}-search`}>
        Tìm {label.toLocaleLowerCase("vi")}
        <input
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tên hoặc biệt danh, có/không dấu"
        />
      </label>
      <label htmlFor={id}>
        {label}
        <select
          id={id}
          required={!optional}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {optional ? "Không chọn" : "Chọn thành viên"}
          </option>
          {filtered.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
              {lineageOf(m, members) ? ` · ${lineageOf(m, members)}` : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
export function EventSelect({
  data,
  value,
  onChange,
  required = false,
}: {
  data: FamilyData;
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}) {
  return (
    <label>
      Sự kiện liên quan
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          {required ? "Chọn sự kiện" : "Không gắn sự kiện"}
        </option>
        {data.content
          .filter((c) => c.kind === "event")
          .map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} · {e.date}
            </option>
          ))}
      </select>
    </label>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="community-empty">{children}</div>;
}
export function AdminGate({
  authenticated,
  onLogin,
  children,
}: {
  authenticated: boolean;
  onLogin: () => void;
  children: ReactNode;
}) {
  return authenticated ? (
    children
  ) : (
    <p className="community-note">
      Ban quản trị có thể bổ sung và biên tập tại đây.{" "}
      <button type="button" onClick={onLogin}>
        Đăng nhập quản trị
      </button>
    </p>
  );
}
export async function uploadFile(file: File): Promise<string> {
  if (!file.size || file.size > 4 * 1024 * 1024)
    throw new Error("Tệp phải có nội dung và không vượt quá 4 MB.");
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Không tải được tệp.");
  return result.fileUrl;
}
export function UploadField({
  label,
  accept = "image/jpeg,image/png,image/webp",
  value,
  onChange,
}: {
  label: string;
  accept?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <label>
        {label} (tối đa 4 MB)
        <input
          type="file"
          accept={accept}
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              onChange(await uploadFile(file));
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {busy && <p role="status">Đang tải tệp…</p>}
      {value && (
        <p className="community-note">
          <a href={value} target="_blank" rel="noreferrer">
            Mở tệp đã chọn
          </a>{" "}
          <button type="button" onClick={() => onChange("")}>
            Bỏ tệp
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
    </div>
  );
}
export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const run = async (
    operation: () => Promise<void>,
    success = "Đã lưu thay đổi.",
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      setMessage(success);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  };
  const feedback = (
    <>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="community-success" role="status">
          {message}
        </p>
      )}
    </>
  );
  return { busy, run, feedback };
}
