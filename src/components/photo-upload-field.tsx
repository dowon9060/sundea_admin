"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { adminUploadPhoto } from "@/lib/admin";

export const MAX_STORE_PHOTOS = 5;

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

type Props = {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
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

function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function PhotoUploadField({ label = "사진", value, onChange }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const canAdd = value.length < MAX_STORE_PHOTOS && !uploading;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (valueRef.current.length >= MAX_STORE_PHOTOS) {
      setError(`사진은 최대 ${MAX_STORE_PHOTOS}장까지 첨부할 수 있습니다.`);
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("원본 사진은 20MB 이하만 올릴 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      const resized = await resizeToJpeg(file);
      const { url } = await adminUploadPhoto(resized);
      onChange([...valueRef.current, url].slice(0, MAX_STORE_PHOTOS));
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>, index: number) {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 캡처 불가 포인터여도 드래그 자체는 진행
    }
    setDragIndex(index);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragIndex == null) return;
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-photo-index]");
    if (!target) return;
    const over = Number(target.dataset.photoIndex);
    if (!Number.isInteger(over) || over === dragIndex) return;
    onChange(move(value, dragIndex, over));
    setDragIndex(over);
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragIndex(null);
  }

  return (
    <div className="text-sm">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-stone-700">{label}</span>
        <span className="text-xs text-muted">
          {value.length}/{MAX_STORE_PHOTOS}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={!canAdd}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <label
          htmlFor={inputId}
          aria-disabled={!canAdd}
          className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-stone-50 text-xs text-muted ${
            canAdd ? "cursor-pointer hover:bg-stone-100" : "cursor-not-allowed opacity-50"
          }`}
        >
          <span className="text-2xl leading-none text-stone-500">+</span>
          {uploading ? "업로드 중…" : "사진 첨부"}
        </label>

        {value.map((url, index) => (
          <div
            key={url}
            data-photo-index={index}
            onPointerDown={(e) => onPointerDown(e, index)}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`relative h-24 w-24 shrink-0 cursor-grab touch-none overflow-hidden rounded-md border select-none ${
              dragIndex === index
                ? "z-10 scale-105 border-accent shadow-lg"
                : "border-border"
            } transition-transform`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`첨부 사진 ${index + 1}`}
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
            />
            <span
              className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                index === 0 ? "bg-accent text-white" : "bg-black/55 text-white"
              }`}
            >
              {index === 0 ? "썸네일" : index + 1}
            </span>
            <button
              type="button"
              aria-label={`사진 ${index + 1} 삭제`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => remove(index)}
              className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white hover:bg-black/80"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-1.5 text-sm text-red-700">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">
          최대 {MAX_STORE_PHOTOS}장. 첫 번째 사진이 썸네일이 되며, 드래그해서 순서를 바꿀 수
          있습니다. 저장을 눌러야 앱에 반영됩니다.
        </p>
      )}
    </div>
  );
}
