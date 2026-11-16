import { NextRequest, NextResponse } from "next/server";
import {
  getUpstreamAdminKey,
  getUpstreamBaseUrl,
  verifySessionToken,
  SESSION_COOKIE,
} from "@/lib/admin-session";

const UPSTREAM_TIMEOUT_MS = 25_000;
const MAX_BODY_BYTES = 1_000_000;

function isAllowed(path: string, method: string) {
  if (!path.startsWith("admin/")) return false;
  if (path.startsWith("admin/auth/")) return false;
  return ["GET", "POST", "PATCH"].includes(method);
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const method = req.method;

  let base: string;
  try {
    base = getUpstreamBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "백엔드 URL 설정(SUNDAE_API_URL)을 확인해 주세요." },
      { status: 503 },
    );
  }

  if (!isAllowed(path, method)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const adminKey = getUpstreamAdminKey();
  if (!adminKey) {
    return NextResponse.json(
      { error: "SUNDAE_ADMIN_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const target = new URL(`${base}/api/${path}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  const headers = new Headers();
  headers.set("X-Admin-Key", adminKey);
  headers.set("X-Admin-Email", session.email);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = !["GET", "HEAD"].includes(method);
  let body: string | undefined;
  if (hasBody) {
    body = await req.text();
    if (body.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
  } catch {
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  const resHeaders = new Headers();
  const contentTypeRes = upstream.headers.get("content-type");
  if (contentTypeRes) resHeaders.set("content-type", contentTypeRes);

  const text = await upstream.text();
  return new NextResponse(text, { status: upstream.status, headers: resHeaders });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
