"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Attendance, FamilyData } from "@/lib/types";
const FamilyAlbum = dynamic(() => import("./FamilyAlbum"));
const VoiceMemories = dynamic(() => import("./VoiceMemories"));
const FamilyBook = dynamic(() => import("./FamilyBook"));
const Contributions = dynamic(() => import("./Contributions"));
const Gatherings = dynamic(() => import("./Gatherings"));
const Graves = dynamic(() => import("./Graves"));
const Sources = dynamic(() => import("./Sources"));
const tabs = [
  ["album", "Album gắn tên"],
  ["memories", "Ký ức giọng nói"],
  ["book", "Sổ gia phả PDF"],
  ["contributions", "Góp thông tin"],
  ["gatherings", "Giỗ & họp họ"],
  ["graves", "Phần mộ"],
  ["sources", "Đối chiếu tư liệu"],
] as const;
type Tab = (typeof tabs)[number][0];
export default function CommunityHub({
  data,
  authenticated,
  onData,
  openPerson,
  onLogin,
  selfId,
  targetMemberId,
}: {
  data: FamilyData;
  authenticated: boolean;
  onData: (data: FamilyData) => void;
  openPerson: (id: string) => void;
  onLogin: () => void;
  selfId: string;
  targetMemberId: string;
}) {
  const [tab, setTab] = useState<Tab>("album");
  const [mine, setMine] = useState<Omit<Attendance, "owner">[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const apply = () => {
      const value = window.location.hash.split("/")[1];
      if (tabs.some(([key]) => key === value)) setTab(value as Tab);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/community", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const result = await res.json();
        setMine(result.mine);
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setError(
            "Không tải được đăng ký trên trình duyệt này. Tải lại trang để thử lại.",
          );
      });
    return () => controller.abort();
  }, []);
  const act = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Không lưu được thay đổi.");
    onData(result.data);
    setMine(result.mine);
    setError("");
  };
  const props = { data, authenticated, act, openPerson, onLogin, mine };
  return (
    <section className="community-hub container">
      <nav aria-label="Các tiện ích dòng họ" className="community-tabs">
        {tabs.map(([key, title]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              window.location.hash = `community/${key}`;
            }}
          >
            {title}
            {key === "contributions" &&
            authenticated &&
            data.community?.contributions.some((c) => c.status === "pending")
              ? ` (${data.community.contributions.filter((c) => c.status === "pending").length})`
              : ""}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <div
        key={`${tab}-${authenticated}-${targetMemberId}`}
        className="community-panel"
      >
        {tab === "album" && (
          <FamilyAlbum
            {...props}
            selfId={selfId}
            initialMemberId={targetMemberId}
          />
        )}
        {tab === "memories" && (
          <VoiceMemories {...props} initialMemberId={targetMemberId} />
        )}
        {tab === "book" && <FamilyBook data={data} />}
        {tab === "contributions" && (
          <Contributions
            {...props}
            initialMemberId={targetMemberId || selfId}
          />
        )}
        {tab === "gatherings" && <Gatherings {...props} />}
        {tab === "graves" && (
          <Graves {...props} initialMemberId={targetMemberId} />
        )}
        {tab === "sources" && (
          <Sources {...props} initialMemberId={targetMemberId} />
        )}
      </div>
    </section>
  );
}
