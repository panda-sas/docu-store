"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sun, Moon, LogOut } from "lucide-react";
import { BreadCrumb } from "primereact/breadcrumb";
import { Button } from "primereact/button";
import { useAuthz } from "@sentinel-auth/react";

import { useSession } from "@/lib/auth";
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs";
import { useThemeStore } from "@/lib/stores/theme-store";

export function Topbar() {
  const { user, workspace } = useSession();
  const { logout } = useAuthz();
  const breadcrumbs = useBreadcrumbs();
  const { theme, toggleTheme } = useThemeStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const bcModel = breadcrumbs.slice(0, -1).map((crumb) => ({
    label: crumb.label,
    template: () => (
      <Link
        href={crumb.href}
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        {crumb.label}
      </Link>
    ),
  }));

  const lastCrumb = breadcrumbs[breadcrumbs.length - 1];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-surface px-6 transition-colors duration-200">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 ? (
        <BreadCrumb
          model={bcModel}
          home={{
            label: lastCrumb?.label,
            template: () => (
              <span className="text-sm font-medium text-text-primary">
                {lastCrumb?.label}
              </span>
            ),
          }}
          className="border-none bg-transparent p-0"
        />
      ) : (
        <span className="text-sm font-medium text-text-primary">
          {lastCrumb?.label}
        </span>
      )}

      {/* Search pill */}
      <button
        onClick={() => router.push(`/${workspace.slug}/search`)}
        className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-sunken px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text-secondary"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search...</span>
        <kbd className="ml-2 rounded border border-border-default bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          {"\u2318"}K
        </kbd>
      </button>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button
          icon={theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          onClick={toggleTheme}
          severity="secondary"
          text
          rounded
          aria-label={theme === "light" ? "Dark mode" : "Light mode"}
          tooltip={theme === "light" ? "Dark mode" : "Light mode"}
          tooltipOptions={{ position: "bottom" }}
        />

        {/* User avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-medium text-accent-text">
          {user.name?.charAt(0) || "?"}
        </div>

        <Button
          icon={<LogOut className="h-4 w-4" />}
          onClick={handleLogout}
          severity="danger"
          text
          rounded
          aria-label="Sign out"
          tooltip="Sign out"
          tooltipOptions={{ position: "bottom" }}
        />
      </div>
    </header>
  );
}
