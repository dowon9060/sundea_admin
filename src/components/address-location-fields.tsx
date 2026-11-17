"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import {
  reverseGeocode,
  searchAddress,
  type GeocodeResult,
} from "@/lib/geocode";

const LocationMapPicker = dynamic(
  () =>
    import("@/components/location-map-picker").then((m) => m.LocationMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center rounded-md border border-border bg-stone-50 text-sm text-muted">
        네이버 지도 불러오는 중…
      </div>
    ),
  },
);

const fieldClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent";

type Props = {
  address: string;
  lat: string;
  lng: string;
  detail: string;
  onAddressChange: (value: string) => void;
  onLatChange: (value: string) => void;
  onLngChange: (value: string) => void;
  onDetailChange: (value: string) => void;
  addressRequired?: boolean;
  latRequired?: boolean;
  lngRequired?: boolean;
};

type Draft = { address: string; lat: number | null; lng: number | null };

function parseCoord(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDraft(address: string, lat: string, lng: string): Draft {
  const latN = parseCoord(lat);
  const lngN = parseCoord(lng);
  const isNullIsland = latN === 0 && lngN === 0;
  return {
    address,
    lat: isNullIsland ? null : latN,
    lng: isNullIsland ? null : lngN,
  };
}

type ModalProps = {
  initial: Draft;
  onClose: () => void;
  onApply: (draft: Draft) => void;
};

function AddressSearchModal({ initial, onClose, onApply }: ModalProps) {
  const listId = useId();
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeq = useRef(0);
  const reverseSeq = useRef(0);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function onQuery(value: string) {
    setQuery(value);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      reqSeq.current++;
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++reqSeq.current;
      try {
        const data = await searchAddress(trimmed);
        if (seq !== reqSeq.current) return;
        setResults(data);
        if (data.length === 0) {
          setError("검색 결과가 없습니다. 도로명·지번·동 이름으로 검색해 주세요.");
        }
      } catch (err) {
        if (seq !== reqSeq.current) return;
        setResults([]);
        setError(
          err instanceof Error ? err.message : "네이버 주소 검색에 실패했습니다.",
        );
      } finally {
        if (seq === reqSeq.current) setSearching(false);
      }
    }, 320);
  }

  function selectResult(item: GeocodeResult) {
    reverseSeq.current++;
    setResolving(false);
    setDraft({ address: item.address, lat: item.lat, lng: item.lng });
    setResults([]);
    setQuery("");
    setError(null);
  }

  async function onMapMove(nextLat: number, nextLng: number) {
    setDraft((prev) => ({ ...prev, lat: nextLat, lng: nextLng }));
    const seq = ++reverseSeq.current;
    setResolving(true);
    setError(null);
    try {
      const data = await reverseGeocode(nextLat, nextLng);
      if (seq !== reverseSeq.current) return;
      setDraft((prev) => ({ ...prev, address: data.address }));
    } catch (err) {
      if (seq !== reverseSeq.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "위치는 옮겼지만 해당 좌표의 주소를 찾지 못했습니다.",
      );
    } finally {
      if (seq === reverseSeq.current) setResolving(false);
    }
  }

  const canApply =
    draft.lat != null && draft.lng != null && draft.address.trim() !== "" && !resolving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl bg-white shadow-xl sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 id={titleId} className="text-base font-semibold text-stone-900">
            주소 검색
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-stone-50"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div className="relative">
            <input
              autoFocus
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="도로명·지번·동 이름으로 네이버 주소 검색"
              className={fieldClass}
              autoComplete="off"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listId}
            />
            {results.length > 0 && (
              <ul
                id={listId}
                role="listbox"
                className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-white shadow-lg"
              >
                {results.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="w-full px-3 py-2 text-left hover:bg-stone-50"
                      onClick={() => selectResult(item)}
                    >
                      <span className="block text-sm font-medium text-stone-900">
                        {item.roadAddress || item.jibunAddress}
                      </span>
                      {item.roadAddress && item.jibunAddress && (
                        <span className="mt-0.5 block text-xs text-muted">
                          지번 {item.jibunAddress}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
                <li className="border-t border-border px-3 py-1.5 text-right text-[11px] text-muted">
                  네이버 주소 검색 결과
                </li>
              </ul>
            )}
          </div>
          {searching && <p className="text-xs text-muted">네이버 검색 중…</p>}

          <LocationMapPicker
            lat={draft.lat}
            lng={draft.lng}
            onChange={(nextLat, nextLng) => void onMapMove(nextLat, nextLng)}
            heightClass="h-80"
          />

          <div className="rounded-md border border-border bg-stone-50 px-3 py-2 text-sm">
            <p className="text-stone-900">
              {resolving
                ? "주소 확인 중…"
                : draft.address || "검색하거나 지도에서 위치를 지정해 주세요."}
            </p>
            {draft.lat != null && draft.lng != null && (
              <p className="mt-0.5 text-xs text-muted">
                위도 {draft.lat} · 경도 {draft.lng}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-stone-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={() => onApply(draft)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            이 위치로 적용
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddressLocationFields({
  address,
  lat,
  lng,
  detail,
  onAddressChange,
  onLatChange,
  onLngChange,
  onDetailChange,
  addressRequired,
  latRequired,
  lngRequired,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  function openModal() {
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block text-stone-700">
          주소
          {addressRequired ? " *" : ""}
        </span>
        <input
          required={addressRequired}
          value={address}
          readOnly
          onClick={openModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal();
            }
          }}
          placeholder="클릭해서 네이버 주소 검색"
          className={`${fieldClass} cursor-pointer`}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-stone-700">상세 주소</span>
        <input
          value={detail}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder="출구·랜드마크·건물 앞 등"
          className={fieldClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-stone-700">
            위도
            {latRequired ? " *" : ""}
          </span>
          <input
            required={latRequired}
            value={lat}
            placeholder="주소 검색 시 자동 입력"
            className={`${fieldClass} bg-stone-50`}
            readOnly
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-stone-700">
            경도
            {lngRequired ? " *" : ""}
          </span>
          <input
            required={lngRequired}
            value={lng}
            placeholder="주소 검색 시 자동 입력"
            className={`${fieldClass} bg-stone-50`}
            readOnly
          />
        </label>
      </div>

      {modalOpen && (
        <AddressSearchModal
          initial={toDraft(address, lat, lng)}
          onClose={() => setModalOpen(false)}
          onApply={(draft) => {
            if (draft.lat == null || draft.lng == null) return;
            onAddressChange(draft.address);
            onLatChange(String(draft.lat));
            onLngChange(String(draft.lng));
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
