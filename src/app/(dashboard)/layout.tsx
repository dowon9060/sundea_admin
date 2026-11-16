"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { adminKey, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !adminKey) {
      router.replace("/login");
    }
  }, [ready, adminKey, router]);

  if (!ready || !adminKey) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        불러오는 중…
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
