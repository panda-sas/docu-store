"use client";

import { AuthzGuard } from "@sentinel-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}

export function AuthGuardWrapper({ children }: { children: ReactNode }) {
  return (
    <AuthzGuard
      fallback={<RedirectToLogin />}
      loading={
        <div className="flex h-screen items-center justify-center bg-surface-sunken">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-accent" />
        </div>
      }
    >
      {children}
    </AuthzGuard>
  );
}
