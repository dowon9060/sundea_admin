"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchAddress, type GeocodeResult } from "@/lib/geocode";

const fieldClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent";

type DaumPostcodeData = {
  roadAddress?: string;
  jibunAddress?: string;
  autoRoadAddress?: string;
  autoJibunAddress?: string;
  buildingName?: string;
  sido?: string;
  sigungu?: string;
};

type DaumPostcodeCtor = new (options: {
  oncomplete: (data: DaumPostcodeData) => void;
  width?: string | number;
  height?: string | number;
}) => { open: () => void };

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcodeCtor };
  }
}

type Props = {
  address: string;
  lat: string;
  lng: string;
  onAddressChange: (value: string) => void;
  onLatChange: (value: string) => void;
  onLngChange: (value: string) => void;
  addressRequired?: boolean;
  latRequired?: boolean;
  lngRequired?: boolean;
  addressLabel?: string;
  addressPlaceholder?: string;
};

function loadDaumPostcode(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.daum?.Postcode) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-daum-postcode="1"]',
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("우편번호 스크립트를 불러오지 못했습니다.")),
        { once: true },
      );
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.dataset.daumPostcode = "1";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("우편번호 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

export function AddressLocationFields({
  address,
  lat,
  lng,
  onAddressChange,
  onLatChange,
  onLngChange,
  addressRequired,
  latRequired,
  lngRequired,
  addressLabel = "주소",
  addressPlaceholder = "예: 서울특별시 송파구 문정동 618",
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function applyResult(item: GeocodeResult) {
    onAddressChange(item.address);
    onLatChange(String(item.lat));
    onLngChange(String(item.lng));
    setQuery("");
    setResults([]);
    setOpen(false);
    setError(null);
    setHint(`위치 반영: ${item.name}`);
  }

  function scheduleSearch(value: string) {
    setQuery(value);
    setError(null);
    setHint(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
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
        setOpen(true);
        if (data.length === 0) {
          setError("검색 결과가 없습니다. 다른 키워드로 시도해 주세요.");
        }
      } catch (err) {
        if (seq !== reqSeq.current) return;
        setResults([]);
        setOpen(false);
        setError(
          err instanceof Error ? err.message : "주소 검색에 실패했습니다.",
        );
      } finally {
        if (seq === reqSeq.current) setSearching(false);
      }
    }, 320);
  }

  async function openPostcode() {
    setError(null);
    setHint(null);
    try {
      await loadDaumPostcode();
      if (!window.daum?.Postcode) {
        throw new Error("우편번호 서비스를 사용할 수 없습니다.");
      }
      new window.daum.Postcode({
        oncomplete: async (data) => {
          const road =
            data.roadAddress ||
            data.autoRoadAddress ||
            data.jibunAddress ||
            data.autoJibunAddress ||
            "";
          const building = data.buildingName ? ` ${data.buildingName}` : "";
          const picked = `${road}${building}`.trim();
          if (!picked) {
            setError("선택한 주소를 확인하지 못했습니다.");
            return;
          }
          onAddressChange(picked);
          setSearching(true);
          try {
            const dataList = await searchAddress(picked);
            const first = dataList[0];
            if (!first) {
              setError(
                "주소는 입력됐지만 좌표를 찾지 못했습니다. 위도·경도를 직접 입력해 주세요.",
              );
              return;
            }
            onLatChange(String(first.lat));
            onLngChange(String(first.lng));
            setHint(`좌표 반영: ${first.lat}, ${first.lng}`);
            setError(null);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "좌표 검색에 실패했습니다. 위도·경도를 직접 입력해 주세요.",
            );
          } finally {
            setSearching(false);
          }
        },
      }).open();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "우편번호 검색을 열 수 없습니다.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div ref={wrapRef} className="relative">
        <label className="block text-sm">
          <span className="mb-1.5 block text-stone-700">주소 검색</span>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => scheduleSearch(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setOpen(true);
              }}
              placeholder="동·역·도로명으로 검색"
              className={fieldClass}
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
            />
            <button
              type="button"
              onClick={() => void openPostcode()}
              className="shrink-0 rounded-md border border-border px-3 py-2 text-sm whitespace-nowrap hover:bg-stone-50"
            >
              우편번호
            </button>
          </div>
        </label>
        {searching && (
          <p className="mt-1.5 text-xs text-muted">검색 중…</p>
        )}
        {open && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-white shadow-lg"
          >
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  className="w-full px-3 py-2 text-left hover:bg-stone-50"
                  onClick={() => applyResult(item)}
                >
                  <span className="block text-sm font-medium text-stone-900">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {item.address}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block text-stone-700">
          {addressLabel}
          {addressRequired ? " *" : ""}
        </span>
        <input
          required={addressRequired}
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={addressPlaceholder}
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
            onChange={(e) => onLatChange(e.target.value)}
            placeholder="37.5"
            className={fieldClass}
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
            onChange={(e) => onLngChange(e.target.value)}
            placeholder="127.0"
            className={fieldClass}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {hint && !error && <p className="text-sm text-green-700">{hint}</p>}
      <p className="text-xs text-muted">
        검색 또는 우편번호로 주소를 고르면 위도·경도가 자동 입력됩니다.
      </p>
    </div>
  );
}
