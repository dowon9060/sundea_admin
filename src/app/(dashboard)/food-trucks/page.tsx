"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminListRegions, adminListStores } from "@/lib/admin";
import { ApiError } from "@/lib/api-error";
import {
  BUSINESS_STATUS_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import type {
  AdminStoreListItem,
  RegionCount,
  StoreCategory,
  StoreStatus,
} from "@/lib/types";

export default function FoodTrucksPage() {
  const [items, setItems] = useState<AdminStoreListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [regions, setRegions] = useState<RegionCount[]>([]);
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState<"" | StoreCategory>("");
  const [status, setStatus] = useState<"" | StoreStatus>("");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, regionList] = await Promise.all([
        adminListStores({
          region: region || undefined,
          category: category || undefined,
          status: status || undefined,
          q: q || undefined,
          limit: 100,
        }),
        adminListRegions(),
      ]);
      setItems(list.items);
      setTotal(list.total);
      setRegions(regionList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [region, category, status, q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">푸드트럭 관리</h2>
          <p className="mt-1 text-sm text-muted">등록된 판매점 {total}곳</p>
        </div>
        <Link
          href="/food-trucks/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          푸드트럭 등록
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 border border-border bg-surface p-4">
        <label className="text-sm">
          <span className="mb-1 block text-muted">지역(시/도)</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="min-w-40 rounded-md border border-border bg-white px-3 py-2"
          >
            <option value="">전체</option>
            {regions.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} ({r.count})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">카테고리</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "" | StoreCategory)}
            className="min-w-32 rounded-md border border-border bg-white px-3 py-2"
          >
            <option value="">전체</option>
            <option value="sundae">순대차</option>
            <option value="chicken">통닭</option>
            <option value="other">타코야끼</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">상태</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | StoreStatus)}
            className="min-w-28 rounded-md border border-border bg-white px-3 py-2"
          >
            <option value="">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </label>
        <form
          className="flex flex-1 flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(searchInput.trim());
          }}
        >
          <label className="min-w-48 flex-1 text-sm">
            <span className="mb-1 block text-muted">이름 검색</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2"
              placeholder="가게 이름"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-stone-50"
          >
            검색
          </button>
        </form>
      </div>

      {error && (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="overflow-x-auto border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-stone-50 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">카테고리</th>
              <th className="px-4 py-3 font-medium">지역</th>
              <th className="px-4 py-3 font-medium">주소</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">영업</th>
              <th className="px-4 py-3 font-medium">위치 갱신</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  불러오는 중…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  조건에 맞는 푸드트럭이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-border hover:bg-stone-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/food-trucks/${item.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.menu_summary && (
                      <div className="mt-0.5 text-xs text-muted">{item.menu_summary}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{CATEGORY_LABELS[item.category]}</td>
                  <td className="px-4 py-3">{item.region ?? "-"}</td>
                  <td className="max-w-56 truncate px-4 py-3" title={item.address ?? undefined}>
                    {item.address ?? "-"}
                  </td>
                  <td className="px-4 py-3">{STATUS_LABELS[item.status]}</td>
                  <td className="px-4 py-3">
                    {BUSINESS_STATUS_LABELS[item.business_status]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {item.location_updated_at
                      ? item.location_updated_at.slice(0, 10)
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
