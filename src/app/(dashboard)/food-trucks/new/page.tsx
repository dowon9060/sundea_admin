"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CategorySelect } from "@/components/category-select";
import { adminCreateStore } from "@/lib/admin";
import { ApiError } from "@/lib/api-error";
import type { BusinessStatus, StoreCategory } from "@/lib/types";

type MenuDraft = { name: string; price: string };

const fieldClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent";

export default function NewFoodTruckPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StoreCategory>("sundae");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [businessStatus, setBusinessStatus] =
    useState<BusinessStatus>("unknown");
  const [menus, setMenus] = useState<MenuDraft[]>([{ name: "", price: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const latN = Number(lat);
      const lngN = Number(lng);
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
        throw new ApiError("위도·경도를 숫자로 입력해 주세요.", 400);
      }
      const created = await adminCreateStore({
        name,
        category,
        address,
        lat: latN,
        lng: lngN,
        location_note: locationNote || null,
        description: description || null,
        photo_url: photoUrl || null,
        business_status: businessStatus,
        status: "active",
        menus: menus
          .filter((m) => m.name.trim())
          .map((m) => ({
            name: m.name.trim(),
            price: Number(m.price) || 0,
          })),
      });
      router.replace(`/food-trucks/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/food-trucks" className="text-sm text-muted hover:text-accent">
          ← 목록
        </Link>
        <h2 className="mt-2 text-xl font-semibold">푸드트럭 등록</h2>
        <p className="mt-1 text-sm text-muted">
          등록 즉시 앱 주변 목록에 반영됩니다 (status: active).
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 border border-border bg-surface p-5">
        <Field label="이름" required>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="카테고리" required>
          <CategorySelect
            value={category}
            onChange={(v) => {
              if (v) setCategory(v);
            }}
            className={fieldClass}
          />
        </Field>
        <Field label="주소 (시/도부터)" required>
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="예: 서울특별시 동작구 상도동"
            className={fieldClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="위도" required>
            <input
              required
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="37.5"
              className={fieldClass}
            />
          </Field>
          <Field label="경도" required>
            <input
              required
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="127.0"
              className={fieldClass}
            />
          </Field>
        </div>
        <Field label="위치 메모">
          <input
            value={locationNote}
            onChange={(e) => setLocationNote(e.target.value)}
            placeholder="출구·랜드마크 등"
            className={fieldClass}
          />
        </Field>
        <Field label="설명">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={fieldClass}
          />
        </Field>
        <Field label="사진 URL">
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            className={fieldClass}
          />
        </Field>
        <Field label="영업 상태">
          <select
            value={businessStatus}
            onChange={(e) =>
              setBusinessStatus(e.target.value as BusinessStatus)
            }
            className={fieldClass}
          >
            <option value="unknown">미확인</option>
            <option value="expected">출몰 예상</option>
            <option value="confirmed_open">영업 확인</option>
          </select>
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-stone-700">메뉴</span>
            <button
              type="button"
              className="text-sm text-accent"
              onClick={() => setMenus((prev) => [...prev, { name: "", price: "" }])}
            >
              메뉴 추가
            </button>
          </div>
          <div className="space-y-2">
            {menus.map((menu, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px] gap-2">
                <input
                  value={menu.name}
                  onChange={(e) =>
                    setMenus((prev) =>
                      prev.map((m, i) =>
                        i === idx ? { ...m, name: e.target.value } : m,
                      ),
                    )
                  }
                  placeholder="메뉴명"
                  className={fieldClass}
                />
                <input
                  value={menu.price}
                  onChange={(e) =>
                    setMenus((prev) =>
                      prev.map((m, i) =>
                        i === idx ? { ...m, price: e.target.value } : m,
                      ),
                    )
                  }
                  placeholder="가격"
                  className={fieldClass}
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/food-trucks"
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "등록 중…" : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-stone-700">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
