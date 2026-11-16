import { NextRequest, NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/admin-session";

type ReverseResult = {
  address: string;
  lat: number;
  lng: number;
  provider: "kakao" | "nominatim";
};

function toNum(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function reverseKakao(
  lat: number,
  lng: number,
  restKey: string,
): Promise<ReverseResult | null> {
  const url =
    `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${encodeURIComponent(String(lng))}` +
    `&y=${encodeURIComponent(String(lat))}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `KakaoAK ${restKey}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    documents?: Array<{
      road_address?: {
        address_name?: string;
        building_name?: string;
      } | null;
      address?: {
        address_name?: string;
      } | null;
    }>;
  };
  const doc = json.documents?.[0];
  if (!doc) return null;
  const road = doc.road_address?.address_name;
  const building = doc.road_address?.building_name
    ? ` ${doc.road_address.building_name}`
    : "";
  const jibun = doc.address?.address_name;
  const address = (road ? `${road}${building}` : jibun || "").trim();
  if (!address) return null;
  return { address, lat, lng, provider: "kakao" };
}

async function reverseNominatim(
  lat: number,
  lng: number,
): Promise<ReverseResult | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lng))}&accept-language=ko`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "sundea-admin/1.0 (local food-truck admin)",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    display_name?: string;
    address?: {
      country?: string;
      state?: string;
      city?: string;
      borough?: string;
      town?: string;
      village?: string;
      suburb?: string;
      neighbourhood?: string;
      quarter?: string;
      road?: string;
      house_number?: string;
      city_district?: string;
      county?: string;
    };
  };

  const a = json.address;
  let address = "";
  if (a) {
    const sido = a.state || "";
    const sigungu = a.city || a.borough || a.county || a.town || "";
    const dong =
      a.suburb || a.neighbourhood || a.quarter || a.city_district || a.village || "";
    const road = [a.road, a.house_number].filter(Boolean).join(" ");
    address = [sido, sigungu, dong, road].filter(Boolean).join(" ").trim();
  }
  if (!address) {
    address = json.display_name?.trim() || "";
  }
  if (!address) return null;
  return { address, lat, lng, provider: "nominatim" };
}

export async function GET(req: NextRequest) {
  const session = await readSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const lat = toNum(req.nextUrl.searchParams.get("lat"));
  const lng = toNum(req.nextUrl.searchParams.get("lng"));
  if (lat == null || lng == null) {
    return NextResponse.json(
      { error: "위도·경도가 필요합니다." },
      { status: 400 },
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "위도·경도 범위가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim() || "";

  try {
    if (kakaoKey) {
      const kakao = await reverseKakao(lat, lng, kakaoKey);
      if (kakao) {
        return NextResponse.json({ data: kakao });
      }
    }
    const osm = await reverseNominatim(lat, lng);
    if (!osm) {
      return NextResponse.json(
        { error: "해당 좌표의 주소를 찾지 못했습니다." },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: osm });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "주소 변환에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
