"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api-error";

const fieldClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent";

export default function ProfilePage() {
  const { admin, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (admin) {
      setName(admin.name);
      setEmail(admin.email);
    }
  }, [admin]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setError("새 비밀번호 확인이 일치하지 않습니다.");
        return;
      }
      if (!currentPassword) {
        setError("비밀번호 변경 시 현재 비밀번호를 입력해 주세요.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name,
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        data?: { name: string; email: string };
      } | null;
      if (!res.ok) {
        throw new ApiError(json?.error || "저장에 실패했습니다.", res.status);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshProfile();
      setMessage("내정보가 저장되었습니다.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold">내정보</h2>
        <p className="mt-1 text-sm text-muted">
          이름·이메일·비밀번호를 수정할 수 있습니다.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 border border-border bg-surface p-5">
        <label className="block text-sm">
          <span className="mb-1.5 block text-stone-700">이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-stone-700">이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={fieldClass}
          />
        </label>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium text-stone-700">비밀번호 변경</p>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">현재 비밀번호</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">새 비밀번호</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">새 비밀번호 확인</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={fieldClass}
              />
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
