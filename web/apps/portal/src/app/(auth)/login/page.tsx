"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { useAuthz } from "@sentinel-auth/react";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuthz();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken">
      <div className="w-full max-w-sm rounded-xl border border-border-default bg-surface-elevated p-8 shadow-ds">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light">
            <FlaskConical className="h-6 w-6 text-accent-text" />
          </div>
          <h1 className="mt-4 text-center text-2xl font-bold text-text-primary">
            DAIKON
          </h1>
          <p className="mt-1 text-center text-sm text-text-secondary">
            Sign in to continue
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => login("google")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2.5 text-sm text-text-primary transition-colors hover:bg-accent-light hover:text-accent-text"
          >
            Continue with Google
          </button>
          <button
            onClick={() => login("github")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2.5 text-sm text-text-primary transition-colors hover:bg-accent-light hover:text-accent-text"
          >
            Continue with GitHub
          </button>
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2.5 text-sm text-text-muted transition-colors"
          >
            Continue with Entra ID
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          Entra ID support coming soon
        </p>
      </div>
    </div>
  );
}
