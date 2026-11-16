"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { adminListRegions } from "@/lib/admin";
import { ApiError } from "@/lib/api-error";

const STORAGE_KEY = "sundae_admin_key";

type AuthContextValue = {
  adminKey: string | null;
  ready: boolean;
  login: (key: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved?.trim()) setAdminKey(saved.trim());
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const login = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      throw new ApiError("관리자 키를 입력해 주세요.", 400);
    }
    await adminListRegions(trimmed);
    localStorage.setItem(STORAGE_KEY, trimmed);
    setAdminKey(trimmed);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAdminKey(null);
  }, []);

  const value = useMemo(
    () => ({ adminKey, ready, login, logout }),
    [adminKey, ready, login, logout],
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
