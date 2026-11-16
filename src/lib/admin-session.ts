import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sundae_admin_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7일

function sessionSecret() {
  const secret = process.env.SUNDAE_SESSION_SECRET?.trim() || "";
  if (!secret) {
    throw new Error("SUNDAE_SESSION_SECRET missing");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

/** payload: email */
export function createSessionToken(email: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `${email}|${exp}`;
  return `${payload}|${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): {
  email: string;
} | null {
  if (!token) return null;
  const parts = token.split("|");
  if (parts.length !== 3) return null;
  const [email, expStr, signature] = parts;
  if (!email || !expStr || !signature) return null;

  const payload = `${email}|${expStr}`;
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

  return { email };
}

export function getUpstreamAdminKey() {
  return process.env.SUNDAE_ADMIN_KEY?.trim() || "";
}

export function getUpstreamBaseUrl() {
  const url = process.env.SUNDAE_API_URL?.trim();
  if (!url) {
    throw new Error("SUNDAE_API_URL missing");
  }
  return url.replace(/\/$/, "");
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

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
