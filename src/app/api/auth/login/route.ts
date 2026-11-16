import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  EMAIL_RE,
  getUpstreamBaseUrl,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "이메일과 비밀번호를 입력해 주세요." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "이메일 형식이 올바르지 않습니다." },
      { status: 400 },
    );
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

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
      { error: json?.error || "로그인에 실패했습니다." },
      { status: upstream.status },
    );
  }

  if (!json?.data?.email) {
    return NextResponse.json(
      { error: "로그인 응답이 올바르지 않습니다." },
      { status: 502 },
    );
  }

  try {
    const token = createSessionToken(json.data.email);
    const res = NextResponse.json({ data: json.data });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json(
      { error: "세션 설정에 실패했습니다. SUNDAE_SESSION_SECRET을 확인해 주세요." },
      { status: 503 },
    );
  }
}
