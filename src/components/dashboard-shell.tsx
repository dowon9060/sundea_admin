"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { useAuth } from "@/contexts/auth-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { logout, adminId } = useAuth();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function onLogout() {
    await logout();
  }

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border px-5 py-6">
          <div className="text-xs font-medium tracking-wide text-muted">순대차</div>
          <div className="mt-1 text-lg font-semibold text-accent">운영 어드민</div>
        </div>
        <DashboardNav className="flex-1" />
        <div className="mt-auto border-t border-border p-4">
          {adminId && (
            <p className="mb-2 truncate text-xs text-muted">{adminId}</p>
          )}
          <button
            type="button"
            onClick={() => void onLogout()}
            className="w-full rounded-md border border-border px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40"
            aria-label="메뉴 닫기"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[min(100%,280px)] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <div className="text-xs font-medium tracking-wide text-muted">순대차</div>
                <div className="text-base font-semibold text-accent">운영 어드민</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm"
              >
                닫기
              </button>
            </div>
            <DashboardNav className="flex-1" onNavigate={() => setMobileNavOpen(false)} />
            <div className="border-t border-border p-4">
              {adminId && (
                <p className="mb-2 truncate text-xs text-muted">{adminId}</p>
              )}
              <button
                type="button"
                onClick={() => void onLogout()}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                로그아웃
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex rounded-md border border-border px-3 py-2 text-sm lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              메뉴
            </button>
            <h1 className="text-lg font-semibold tracking-tight">순대차 어드민</h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
