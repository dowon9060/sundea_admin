import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getUpstreamAdminKey,
  getUpstreamBaseUrl,
  readSessionFromCookies,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/admin-session";

export async function PATCH(req: NextRequest) {
  const session = await readSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
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

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/admin/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
        "X-Admin-Email": session.email,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: "백엔드에 연결할 수 없습니다." },
      { status: 502 },
    );
  }

  const json = (await upstream.json().catch(() => null)) as
    | {
        data?: { id: string; email: string; name: string };
        error?: string;
      }
    | null;

  if (!upstream.ok) {
    return NextResponse.json(
      { error: json?.error || "저장에 실패했습니다." },
      { status: upstream.status },
    );
  }

  if (!json?.data?.email) {
    return NextResponse.json(
      { error: "응답이 올바르지 않습니다." },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ data: json.data });
  // 이메일이 바뀌면 세션도 갱신
  try {
    const token = createSessionToken(json.data.email);
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  } catch {
    // 세션 갱신 실패해도 프로필 저장은 성공
  }
  return res;
}
