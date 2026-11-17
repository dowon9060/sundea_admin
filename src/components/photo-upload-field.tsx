"use client";

import { useId, useRef, useState } from "react";
import { adminUploadPhoto } from "@/lib/admin";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

type Props = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
};

/** 긴 변 1600px 이하 JPEG로 줄여 업로드 용량과 앱 로딩을 줄인다 */
async function resizeToJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("이미지를 읽을 수 없습니다. JPG·PNG·WEBP 파일로 올려 주세요.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 변환을 지원하지 않는 브라우저입니다.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("이미지 변환에 실패했습니다.");
  return blob;
}

export function PhotoUploadField({ label = "사진", value, onChange }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_SOURCE_BYTES) {
      setError("원본 사진은 20MB 이하만 올릴 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      const resized = await resizeToJpeg(file);
      const { url } = await adminUploadPhoto(resized);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="text-sm">
      <span className="mb-1.5 block text-stone-700">{label}</span>
      <div className="flex items-start gap-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-stone-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="첨부 사진" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted">사진 없음</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer items-center justify-center rounded-md border border-border px-3 py-2 text-sm whitespace-nowrap hover:bg-stone-50 ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {uploading ? "업로드 중…" : value ? "사진 변경" : "파일 첨부"}
          </label>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md border border-border px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              삭제
            </button>
          )}
        </div>
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-red-700">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">
          JPG·PNG·WEBP. 저장을 눌러야 앱에 반영됩니다.
        </p>
      )}
    </div>
  );
}
