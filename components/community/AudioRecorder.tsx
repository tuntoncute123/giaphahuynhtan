"use client";
import { useEffect, useRef, useState } from "react";
import { uploadFile } from "./shared";
export default function AudioRecorder({
  onReady,
}: {
  onReady: (url: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!blob) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };
  const start = async () => {
    setError("");
    setBlob(null);
    setSeconds(0);
    setBusy(true);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Trình duyệt chưa hỗ trợ ghi âm. Bạn có thể tải tệp ghi âm có sẵn bên dưới.",
        );
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        audio.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = audio;
      const type = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const media = new MediaRecorder(audio, {
        ...(type ? { mimeType: type } : {}),
        audioBitsPerSecond: 64000,
      });
      recorder.current = media;
      const chunks: Blob[] = [];
      let total = 0;
      let elapsed = 0;
      media.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          total += e.data.size;
          if (total >= 3500000) stop();
        }
      };
      media.onstop = () => {
        audio.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        if (mounted.current) {
          setRecording(false);
          setBlob(new Blob(chunks, { type: media.mimeType || "audio/webm" }));
        }
      };
      media.onerror = () => {
        stop();
        if (mounted.current)
          setError("Ghi âm bị gián đoạn. Hãy thử lại hoặc tải tệp có sẵn.");
      };
      media.start(1000);
      setRecording(true);
      timer.current = setInterval(() => {
        elapsed++;
        if (mounted.current) setSeconds(elapsed);
        if (elapsed >= 300) stop();
      }, 1000);
    } catch (error) {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (mounted.current)
        setError((error as Error).message || "Không mở được micro.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <div className="community-recorder">
      <h4>Ghi âm lời kể</h4>
      <p>
        Đoạn tối đa 5 phút. Nghe lại trước khi lưu. Người kể cần đồng ý công
        khai bản ghi.
      </p>
      <div className="community-actions">
        <button
          type="button"
          className={recording ? "danger-btn" : "outline-btn"}
          disabled={busy}
          onClick={recording ? stop : start}
        >
          {recording
            ? `Dừng ghi · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
            : "Bắt đầu ghi âm"}
        </button>
        <span aria-live="polite">
          {recording ? "● Đang ghi âm" : busy ? "Đang xử lý…" : ""}
        </span>
      </div>
      {preview && (
        <>
          <audio controls src={preview} />
          <button
            type="button"
            className="primary-btn"
            disabled={busy}
            onClick={async () => {
              if (!blob) return;
              setBusy(true);
              setError("");
              try {
                const ext = blob.type.includes("mp4")
                  ? "m4a"
                  : blob.type.includes("ogg")
                    ? "ogg"
                    : "webm";
                onReady(
                  await uploadFile(
                    new File([blob], `loi-ke.${ext}`, {
                      type: blob.type.split(";")[0],
                    }),
                  ),
                );
                setBlob(null);
              } catch (error) {
                setError((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Dùng bản ghi này
          </button>
        </>
      )}
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
