import type { GeocodeResult, ReverseGeocodeResult } from "@/lib/geocode";

const SCRIPT_ID = "naver-maps-sdk";

type NaverMaps = typeof naver.maps;

let loadPromise: Promise<NaverMaps> | null = null;

function getKeyId() {
  const key = process.env.NEXT_PUBLIC_NCP_KEY_ID?.trim() || "";
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_NCP_KEY_ID가 없습니다. 네이버 클라우드 Maps Client ID를 설정해 주세요.",
    );
  }
  return key;
}

export function loadNaverMaps(): Promise<NaverMaps> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("브라우저에서만 네이버 지도를 사용할 수 있습니다."),
    );
  }
  if (window.naver?.maps) {
    return Promise.resolve(window.naver.maps);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<NaverMaps>((resolve, reject) => {
    const keyId = getKeyId();

    window.navermap_authFailure = () => {
      loadPromise = null;
      reject(
        new Error(
          "네이버 지도 인증에 실패했습니다. NCP 콘솔 Web 서비스 URL에 현재 도메인(예: http://localhost:3000)을 등록해 주세요.",
        ),
      );
    };

    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener(
        "load",
        () => {
          if (window.naver?.maps) resolve(window.naver.maps);
          else reject(new Error("네이버 지도 SDK를 불러오지 못했습니다."));
        },
        { once: true },
      );
      existing.addEventListener(
        "error",
        () => {
          loadPromise = null;
          reject(new Error("네이버 지도 SDK 로드에 실패했습니다."));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src =
      `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(keyId)}` +
      `&submodules=geocoder`;
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver.maps);
      else {
        loadPromise = null;
        reject(new Error("네이버 지도 SDK를 불러오지 못했습니다."));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("네이버 지도 SDK 로드에 실패했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

function formatReverseAddress(
  response: naver.maps.Service.ReverseGeocodeResponse,
): string {
  const ready = response.v2.address;
  if (ready?.roadAddress) return ready.roadAddress;
  if (ready?.jibunAddress) return ready.jibunAddress;

  const order = response.v2.results?.[0];
  if (!order) return "";

  const region = order.region;
  const land = order.land;
  const sido = region?.area1?.name || "";
  const sigungu = region?.area2?.name || "";
  const dong = region?.area3?.name || "";
  const ri = region?.area4?.name || "";
  const road = land?.name || "";
  const number = land?.number1
    ? land.number2
      ? `${land.number1}-${land.number2}`
      : land.number1
    : "";
  const addition = land?.addition0?.value || "";
  const base = [sido, sigungu, dong, ri].filter(Boolean).join(" ");
  if (road) {
    return [base, `${road} ${number}`.trim(), addition]
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  return [base, number, addition].filter(Boolean).join(" ").trim();
}

export async function searchNaverAddress(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const maps = await loadNaverMaps();
  if (!maps.Service?.geocode) {
    throw new Error("네이버 Geocoder 모듈을 사용할 수 없습니다.");
  }

  return new Promise((resolve, reject) => {
    maps.Service.geocode({ query: q }, (status, response) => {
      if (status !== maps.Service.Status.OK) {
        reject(new Error("네이버 주소 검색에 실패했습니다."));
        return;
      }
      const addresses = response.v2?.addresses ?? [];
      const results: GeocodeResult[] = addresses
        .map((item, index) => {
          const lat = Number(item.y);
          const lng = Number(item.x);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const address = item.roadAddress || item.jibunAddress || "";
          if (!address) return null;
          return {
            id: `naver-${index}-${item.x}-${item.y}`,
            name: item.roadAddress || item.jibunAddress || address,
            address,
            lat,
            lng,
            provider: "naver" as const,
          };
        })
        .filter((v): v is GeocodeResult => v != null);
      resolve(results);
    });
  });
}

export async function reverseNaverGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const maps = await loadNaverMaps();
  if (!maps.Service?.reverseGeocode) {
    throw new Error("네이버 Geocoder 모듈을 사용할 수 없습니다.");
  }

  return new Promise((resolve, reject) => {
    const coords = new maps.LatLng(lat, lng);
    maps.Service.reverseGeocode(
      {
        coords,
        orders: [
          maps.Service.OrderType.ROAD_ADDR,
          maps.Service.OrderType.ADDR,
        ].join(","),
      },
      (status, response) => {
        if (status !== maps.Service.Status.OK) {
          reject(new Error("네이버 좌표 주소 변환에 실패했습니다."));
          return;
        }
        const address = formatReverseAddress(response);
        if (!address) {
          reject(new Error("해당 좌표의 주소를 찾지 못했습니다."));
          return;
        }
        resolve({
          address,
          lat,
          lng,
          provider: "naver",
        });
      },
    );
  });
}

declare global {
  interface Window {
    naver?: typeof naver;
    navermap_authFailure?: () => void;
  }
}
