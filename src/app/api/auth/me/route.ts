import { NextResponse } from "next/server";
import {
  getUpstreamAdminKey,
  getUpstreamBaseUrl,
  readSessionFromCookies,
} from "@/lib/admin-session";

export async function GET() {
  const session = await readSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let base: string;
  try {
    base = getUpstreamBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "백엔드 URL 설정(SUNDAE_API_URL)을 확인해 주세요." },
      { status: 503 },
    );
  }

  const adminKey = getUpstreamAdminKey();
  if (!adminKey) {
    return NextResponse.json(
      { error: "SUNDAE_ADMIN_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(`${base}/api/admin/me`, {
      headers: {
        "X-Admin-Key": adminKey,
        "X-Admin-Email": session.email,
      },
    });
    const json = (await upstream.json().catch(() => null)) as
      | { data?: unknown; error?: string }
      | null;
    if (!upstream.ok) {
      return NextResponse.json(
        { error: json?.error || "프로필을 불러오지 못했습니다." },
        { status: upstream.status },
      );
    }
    return NextResponse.json({ data: json?.data });
  } catch {
    return NextResponse.json(
      { error: "백엔드에 연결할 수 없습니다." },
      { status: 502 },
    );
  }
}
