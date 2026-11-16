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
      <div className="flex h-72 items-center justify-center rounded-md border border-border bg-stone-50 text-sm text-muted">
        지도 불러오는 중…
      </div>
    ),
  },
);

const fieldClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent";

type DaumPostcodeData = {
  roadAddress?: string;
  jibunAddress?: string;
  autoRoadAddress?: string;
  autoJibunAddress?: string;
  buildingName?: string;
};

type DaumPostcodeCtor = new (options: {
  oncomplete: (data: DaumPostcodeData) => void;
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
      "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.dataset.daumPostcode = "1";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("우편번호 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

function parseCoord(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
  addressPlaceholder = "주소 검색으로 선택하거나 지도에서 지정",
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeq = useRef(0);
  const reverseSeq = useRef(0);

  const latN = parseCoord(lat);
  const lngN = parseCoord(lng);

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

  async function applyCoords(nextLat: number, nextLng: number, opts?: {
    keepAddress?: boolean;
    openMap?: boolean;
    hintText?: string;
  }) {
    onLatChange(String(nextLat));
    onLngChange(String(nextLng));
    if (opts?.openMap) setMapOpen(true);
    if (opts?.keepAddress) {
      if (opts.hintText) setHint(opts.hintText);
      return;
    }

    const seq = ++reverseSeq.current;
    setResolving(true);
    setError(null);
    try {
      const data = await reverseGeocode(nextLat, nextLng);
      if (seq !== reverseSeq.current) return;
      onAddressChange(data.address);
      setHint(opts?.hintText || `위치·주소 반영: ${data.address}`);
    } catch (err) {
      if (seq !== reverseSeq.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "좌표는 반영됐지만 주소를 찾지 못했습니다.",
      );
    } finally {
      if (seq === reverseSeq.current) setResolving(false);
    }
  }

  function applyResult(item: GeocodeResult) {
    onAddressChange(item.address);
    onLatChange(String(item.lat));
    onLngChange(String(item.lng));
    setQuery("");
    setResults([]);
    setOpen(false);
    setError(null);
    setHint(`위치 반영: ${item.name}`);
    setMapOpen(true);
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
                "주소는 입력됐지만 좌표를 찾지 못했습니다. 지도로 위치를 지정해 주세요.",
              );
              setMapOpen(true);
              return;
            }
            onLatChange(String(first.lat));
            onLngChange(String(first.lng));
            setHint(`좌표 반영: ${first.lat}, ${first.lng}`);
            setError(null);
            setMapOpen(true);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "좌표 검색에 실패했습니다. 지도로 위치를 지정해 주세요.",
            );
            setMapOpen(true);
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

  function toggleMap() {
    setMapOpen((prev) => !prev);
    setError(null);
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
            <button
              type="button"
              onClick={toggleMap}
              className="shrink-0 rounded-md border border-border px-3 py-2 text-sm whitespace-nowrap hover:bg-stone-50"
            >
              {mapOpen ? "지도 닫기" : "지도로 보기"}
            </button>
          </div>
        </label>
        {(searching || resolving) && (
          <p className="mt-1.5 text-xs text-muted">
            {resolving ? "주소 변환 중…" : "검색 중…"}
          </p>
        )}
        {open && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-white shadow-lg"
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
          title="주소 검색 또는 지도에서 위치를 지정하면 자동 입력됩니다"
        />
      </label>

      {mapOpen && (
        <LocationMapPicker
          lat={latN}
          lng={lngN}
          onChange={(nextLat, nextLng) => {
            void applyCoords(nextLat, nextLng, {
              hintText: "지도에서 위치를 변경했습니다. 저장하면 앱에 반영됩니다.",
            });
          }}
        />
      )}

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
            onChange={(e) => onLngChange(e.target.value)}
            placeholder="127.0"
            className={fieldClass}
            readOnly
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {hint && !error && <p className="text-sm text-green-700">{hint}</p>}
      <p className="text-xs text-muted">
        주소 검색·우편번호·지도로 위치를 잡은 뒤 저장하면 앱에 그대로 노출됩니다.
      </p>
    </div>
  );
}
