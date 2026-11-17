"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AddressLocationFields } from "@/components/address-location-fields";
import { CategorySelect } from "@/components/category-select";
import { adminGetStore, adminUpdateHours, adminUpdateStore } from "@/lib/admin";
import { ApiError } from "@/lib/api-error";
import { DAY_LABELS } from "@/lib/labels";
import type {
  AdminStoreDetail,
  BusinessStatus,
  StoreCategory,
  StoreStatus,
} from "@/lib/types";

const fieldClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent";

type MenuDraft = { name: string; price: string };
type HourDraft = {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

export default function FoodTruckDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [store, setStore] = useState<AdminStoreDetail | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StoreCategory>("sundae");
  const [status, setStatus] = useState<StoreStatus>("active");
  const [businessStatus, setBusinessStatus] =
    useState<BusinessStatus>("unknown");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [menus, setMenus] = useState<MenuDraft[]>([]);
  const [hours, setHours] = useState<HourDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetStore(id);
      setStore(data);
      setName(data.name);
      setCategory(data.category);
      setStatus(data.status);
      setBusinessStatus(data.business_status);
      setAddress(data.address ?? "");
      setLat(data.lat != null ? String(data.lat) : "");
      setLng(data.lng != null ? String(data.lng) : "");
      setLocationNote(data.location_note ?? "");
      setDescription(data.description ?? "");
      setPhotoUrl(data.photo_url ?? "");
      setMenus(
        data.menus.length
          ? data.menus.map((m) => ({ name: m.name, price: String(m.price) }))
          : [{ name: "", price: "" }],
      );
      const byDay = new Map(data.hours.map((h) => [h.day_of_week, h]));
      setHours(
        Array.from({ length: 7 }, (_, day) => {
          const h = byDay.get(day);
          return {
            day_of_week: day,
            open_time: h?.open_time ?? "11:00",
            close_time: h?.close_time ?? "20:00",
            is_closed: h ? Boolean(h.is_closed) : true,
          };
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "상세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const latN = Number(lat);
      const lngN = Number(lng);
      if (
        lat.trim() === "" ||
        lng.trim() === "" ||
        (latN === 0 && lngN === 0)
      ) {
        throw new ApiError("주소 검색이나 지도로 위치를 지정해 주세요.", 400);
      }
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
        throw new ApiError("위도·경도를 숫자로 입력해 주세요.", 400);
      }
      await adminUpdateStore(id, {
        name,
        category,
        status,
        business_status: businessStatus,
        address,
        lat: latN,
        lng: lngN,
        location_note: locationNote || null,
        description: description || null,
        photo_url: photoUrl || null,
        menus: menus
          .filter((m) => m.name.trim())
          .map((m) => ({ name: m.name.trim(), price: Number(m.price) || 0 })),
      });
      await adminUpdateHours(
        id,
        hours.map((h) => ({
          day_of_week: h.day_of_week,
          open_time: h.is_closed ? null : h.open_time,
          close_time: h.is_closed ? null : h.close_time,
          is_closed: h.is_closed,
        })),
      );
      setMessage("저장되었습니다. 앱에 반영됩니다.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">불러오는 중…</p>;
  }

  if (!store) {
    return (
      <div>
        <p className="text-sm text-red-700">{error ?? "판매점을 찾을 수 없습니다."}</p>
        <Link href="/food-trucks" className="mt-3 inline-block text-sm text-accent">
          ← 목록
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/food-trucks" className="text-sm text-muted hover:text-accent">
          ← 목록
        </Link>
        <h2 className="mt-2 text-xl font-semibold">{store.name}</h2>
        <p className="mt-1 text-sm text-muted">ID: {store.id}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 border border-border bg-surface p-5">
        <Field label="이름">
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="카테고리">
            <CategorySelect
              value={category}
              onChange={(v) => {
                if (v) setCategory(v);
              }}
              className={fieldClass}
            />
          </Field>
          <Field label="상태">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StoreStatus)}
              className={fieldClass}
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </Field>
          <Field label="영업">
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
        </div>
        <AddressLocationFields
          address={address}
          lat={lat}
          lng={lng}
          onAddressChange={setAddress}
          onLatChange={setLat}
          onLngChange={setLng}
        />
        <Field label="위치 메모">
          <input
            value={locationNote}
            onChange={(e) => setLocationNote(e.target.value)}
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
            className={fieldClass}
          />
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
                  className={fieldClass}
                  placeholder="메뉴명"
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
                  className={fieldClass}
                  placeholder="가격"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm text-stone-700">요일별 영업시간</span>
          <div className="space-y-2">
            {hours.map((h, idx) => (
              <div
                key={h.day_of_week}
                className="grid grid-cols-[40px_1fr_1fr_auto] items-center gap-2"
              >
                <span className="text-sm">{DAY_LABELS[h.day_of_week]}</span>
                <input
                  value={h.open_time}
                  disabled={h.is_closed}
                  onChange={(e) =>
                    setHours((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, open_time: e.target.value } : row,
                      ),
                    )
                  }
                  className={fieldClass}
                />
                <input
                  value={h.close_time}
                  disabled={h.is_closed}
                  onChange={(e) =>
                    setHours((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, close_time: e.target.value } : row,
                      ),
                    )
                  }
                  className={fieldClass}
                />
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={h.is_closed}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, is_closed: e.target.checked } : row,
                        ),
                      )
                    }
                  />
                  휴무
                </label>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-stone-700">{label}</span>
      {children}
    </label>
  );
}
