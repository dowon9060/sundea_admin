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

type AdminProfile = {
  id: string;
  email: string;
  name: string;
};

type AuthContextValue = {
  authenticated: boolean;
  admin: AdminProfile | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [ready, setReady] = useState(false);

  const refreshProfile = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!res.ok) {
      setAuthenticated(false);
      setAdmin(null);
      throw new ApiError(await parseError(res), res.status);
    }
    const json = (await res.json()) as { data?: AdminProfile };
    if (!json.data?.email) {
      setAuthenticated(false);
      setAdmin(null);
      throw new ApiError("프로필을 불러오지 못했습니다.", 502);
    }
    setAuthenticated(true);
    setAdmin(json.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshProfile();
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
          setAdmin(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      throw new ApiError("이메일과 비밀번호를 입력해 주세요.", 400);
    }
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email: trimmed, password }),
    });
    if (!res.ok) {
      throw new ApiError(await parseError(res), res.status);
    }
    const json = (await res.json()) as { data?: AdminProfile };
    if (!json.data?.email) {
      throw new ApiError("로그인 응답이 올바르지 않습니다.", 502);
    }
    setAuthenticated(true);
    setAdmin(json.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      setAuthenticated(false);
      setAdmin(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      authenticated,
      admin,
      ready,
      login,
      logout,
      refreshProfile,
    }),
    [authenticated, admin, ready, login, logout, refreshProfile],
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
