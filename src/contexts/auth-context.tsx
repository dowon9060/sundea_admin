"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError } from "@/lib/api-error";

type AuthContextValue = {
  authenticated: boolean;
  adminId: string | null;
  ready: boolean;
  login: (id: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseError(res: Response) {
  try {
    const json = (await res.json()) as { error?: string };
    if (json?.error) return json.error;
  } catch {
    // ignore
  }
  return "요청에 실패했습니다.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!cancelled && res.ok) {
          const json = (await res.json()) as { data?: { adminId?: string } };
          setAuthenticated(true);
          setAdminId(json.data?.adminId ?? null);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (id: string, password: string) => {
    const trimmedId = id.trim();
    if (!trimmedId || !password) {
      throw new ApiError("아이디와 비밀번호를 입력해 주세요.", 400);
    }
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: trimmedId, password }),
    });
    if (!res.ok) {
      throw new ApiError(await parseError(res), res.status);
    }
    const json = (await res.json()) as { data?: { adminId?: string } };
    setAuthenticated(true);
    setAdminId(json.data?.adminId ?? trimmedId);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      setAuthenticated(false);
      setAdminId(null);
    }
  }, []);

  const value = useMemo(
    () => ({ authenticated, adminId, ready, login, logout }),
    [authenticated, adminId, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}
