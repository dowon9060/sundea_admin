import { NextRequest, NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/admin-session";
import type { GeocodeResult } from "@/lib/geocode";

type KakaoAddressDoc = {
  address_name?: string;
  road_address?: {
    address_name?: string;
    building_name?: string;
  } | null;
  address?: {
    address_name?: string;
  } | null;
  x?: string;
  y?: string;
};

type KakaoKeywordDoc = {
  id?: string;
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
};

type NominatimDoc = {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
};

function toNum(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function searchKakao(query: string, restKey: string): Promise<GeocodeResult[]> {
  const headers = { Authorization: `KakaoAK ${restKey}` };
  const [addressRes, keywordRes] = await Promise.all([
    fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=10`,
      { headers, cache: "no-store" },
    ),
    fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`,
      { headers, cache: "no-store" },
    ),
  ]);

  if (!addressRes.ok && !keywordRes.ok) {
    throw new Error("카카오 주소 검색 API 오류");
  }

  const results: GeocodeResult[] = [];
  const seen = new Set<string>();

  if (addressRes.ok) {
    const json = (await addressRes.json()) as { documents?: KakaoAddressDoc[] };
    for (const doc of json.documents ?? []) {
      const lat = toNum(doc.y);
      const lng = toNum(doc.x);
      if (lat == null || lng == null) continue;
      const address =
        doc.road_address?.address_name ||
        doc.address?.address_name ||
        doc.address_name ||
        "";
      if (!address) continue;
      const key = `${address}|${lat}|${lng}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        id: `kakao-addr-${key}`,
        name: doc.road_address?.building_name || address,
        address,
        lat,
        lng,
        provider: "kakao",
      });
    }
  }

  if (keywordRes.ok) {
    const json = (await keywordRes.json()) as { documents?: KakaoKeywordDoc[] };
    for (const doc of json.documents ?? []) {
      const lat = toNum(doc.y);
      const lng = toNum(doc.x);
      if (lat == null || lng == null) continue;
      const address = doc.road_address_name || doc.address_name || "";
      if (!address) continue;
      const key = `${address}|${lat}|${lng}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        id: `kakao-kw-${doc.id || key}`,
        name: doc.place_name || address,
        address,
        lat,
        lng,
        provider: "kakao",
      });
    }
  }

  return results.slice(0, 12);
}

async function searchNominatim(query: string): Promise<GeocodeResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&countrycodes=kr&q=` +
    encodeURIComponent(query);
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "sundea-admin/1.0 (local food-truck admin)",
    },
  });
  if (!res.ok) {
    throw new Error("주소 검색 서비스 오류");
  }
  const docs = (await res.json()) as NominatimDoc[];
  const results: GeocodeResult[] = [];
  for (const doc of docs) {
    const lat = toNum(doc.lat);
    const lng = toNum(doc.lon);
    if (lat == null || lng == null) continue;
    const address = doc.display_name?.trim();
    if (!address) continue;
    results.push({
      id: `osm-${doc.place_id ?? `${lat},${lng}`}`,
      name: doc.name || address.split(",")[0]?.trim() || address,
      address,
      lat,
      lng,
      provider: "nominatim",
    });
  }
  return results;
}

export async function GET(req: NextRequest) {
  const session = await readSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) {
    return NextResponse.json({ data: [] as GeocodeResult[] });
  }

  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim() || "";

  try {
    if (kakaoKey) {
      const data = await searchKakao(q, kakaoKey);
      if (data.length > 0) {
        return NextResponse.json({ data });
      }
    }
    const data = await searchNominatim(q);
    return NextResponse.json({ data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "주소 검색에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
