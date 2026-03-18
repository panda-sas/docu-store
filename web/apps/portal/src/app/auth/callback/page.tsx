"use client";

import { useRouter } from "next/navigation";
import { AuthzCallback } from "@sentinel-auth/react";

export default function AuthCallbackPage() {
  const router = useRouter();

  return (
    <AuthzCallback
      onSuccess={(user) => router.replace(`/${user.workspaceSlug}`)}
      loadingComponent={
        <div className="flex h-screen items-center justify-center bg-surface-sunken">
          <div className="text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-accent" />
            <p className="text-sm text-text-muted">Signing you in...</p>
          </div>
        </div>
      }
      errorComponent={(error) => (
        <div className="flex h-screen items-center justify-center bg-surface-sunken">
          <div className="max-w-sm rounded-xl border border-border-default bg-surface-elevated p-8 text-center shadow-ds">
            <p className="mb-4 text-sm text-red-500">{error.message}</p>
            <a
              href="/login"
              className="text-sm text-accent-text underline hover:text-text-primary"
            >
              Back to login
            </a>
          </div>
        </div>
      )}
      workspaceSelector={({ workspaces, onSelect, isLoading }) => (
        <div className="flex h-screen items-center justify-center bg-surface-sunken">
          <div className="w-full max-w-sm">
            <h2 className="mb-4 text-center text-lg font-semibold text-text-primary">
              Select Workspace
            </h2>
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => onSelect(ws.id)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-border-default bg-surface-elevated p-4 text-left shadow-ds transition hover:border-accent disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-text-primary">
                        {ws.name}
                      </div>
                      <div className="text-xs text-text-muted">{ws.slug}</div>
                    </div>
                    <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent-text">
                      {ws.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    />
  );
}
