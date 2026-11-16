import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getAdminCredentials,
  safeEqualString,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  let body: { id?: string; password?: string };
  try {
    body = (await req.json()) as { id?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const id = body.id?.trim() ?? "";
  const password = body.password ?? "";

  if (!id || !password) {
    return NextResponse.json(
      { error: "아이디와 비밀번호를 입력해 주세요." },
      { status: 400 },
    );
  }

  const configured = getAdminCredentials();
  if (!configured.id || !configured.password) {
    return NextResponse.json(
      { error: "관리자 계정이 설정되지 않았습니다. .env.local을 확인해 주세요." },
      { status: 503 },
    );
  }

  const idOk = safeEqualString(id, configured.id);
  const pwOk = safeEqualString(password, configured.password);
  if (!idOk || !pwOk) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  try {
    const token = createSessionToken(configured.id);
    const res = NextResponse.json({
      data: { ok: true, adminId: configured.id },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json(
      { error: "세션 설정에 실패했습니다. SUNDAE_SESSION_SECRET을 확인해 주세요." },
      { status: 503 },
    );
  }
}
