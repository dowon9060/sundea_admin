import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sundae_admin_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7일

function sessionSecret() {
  const secret =
    process.env.SUNDAE_SESSION_SECRET?.trim() ||
    process.env.SUNDAE_ADMIN_PASSWORD?.trim() ||
    "";
  if (!secret) {
    throw new Error("SUNDAE_SESSION_SECRET missing");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function createSessionToken(adminId: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `${adminId}|${exp}`;
  return `${payload}|${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): {
  adminId: string;
} | null {
  if (!token) return null;
  const parts = token.split("|");
  if (parts.length !== 3) return null;
  const [adminId, expStr, signature] = parts;
  if (!adminId || !expStr || !signature) return null;

  const payload = `${adminId}|${expStr}`;
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return { adminId };
}

export function getAdminCredentials() {
  const id = process.env.SUNDAE_ADMIN_ID?.trim() || "";
  const password = process.env.SUNDAE_ADMIN_PASSWORD?.trim() || "";
  return { id, password };
}

export function getUpstreamAdminKey() {
  return process.env.SUNDAE_ADMIN_KEY?.trim() || "";
}

export function safeEqualString(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function readSessionFromCookies() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SEC) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
