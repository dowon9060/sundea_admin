"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api-error";

export default function LoginPage() {
  const { adminKey, ready, login } = useAuth();
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && adminKey) {
      router.replace("/food-trucks");
    }
  }, [ready, adminKey, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(key);
      router.replace("/food-trucks");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "로그인에 실패했습니다. 키와 백엔드 연결을 확인해 주세요.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md border border-border bg-surface p-8">
        <p className="text-xs font-medium tracking-wide text-muted">순대차</p>
        <h1 className="mt-1 text-2xl font-semibold text-accent">운영 어드민</h1>
        <p className="mt-2 text-sm text-muted">
          백엔드 ADMIN_KEY를 입력해 로그인합니다.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block text-stone-700">관리자 키</span>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent"
              placeholder="ADMIN_KEY"
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "확인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
