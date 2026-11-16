export type GeocodeResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  provider: "kakao" | "nominatim";
};

export type ReverseGeocodeResult = {
  address: string;
  lat: number;
  lng: number;
  provider: "kakao" | "nominatim";
};

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, {
    credentials: "same-origin",
  });
  const json = (await res.json().catch(() => null)) as
    | { data?: GeocodeResult[]; error?: string }
    | null;

  if (!res.ok) {
    throw new Error(json?.error || "주소 검색에 실패했습니다.");
  }

  return json?.data ?? [];
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const res = await fetch(
    `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    { credentials: "same-origin" },
  );
  const json = (await res.json().catch(() => null)) as
    | { data?: ReverseGeocodeResult; error?: string }
    | null;

  if (!res.ok || !json?.data) {
    throw new Error(json?.error || "좌표 주소를 찾지 못했습니다.");
  }

  return json.data;
}
