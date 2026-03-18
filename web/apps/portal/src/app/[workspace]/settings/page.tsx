"use client";

import { Settings, Sun, Moon } from "lucide-react";
import { SelectButton } from "primereact/selectbutton";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useSession } from "@/lib/auth";

const THEME_OPTIONS = [
  { label: "Light", value: "light" as const, icon: "pi pi-sun" },
  { label: "Dark", value: "dark" as const, icon: "pi pi-moon" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { workspace } = useSession();

  return (
    <div>
      <PageHeader
        icon={Settings}
        title="Settings"
        subtitle="Manage workspace preferences"
      />

      <div className="max-w-2xl space-y-6">
        {/* Theme */}
        <Card>
          <CardHeader title="Appearance" />
          <SelectButton
            value={theme}
            options={THEME_OPTIONS}
            onChange={(e) => {
              if (e.value) setTheme(e.value);
            }}
            itemTemplate={(option) => (
              <span className="flex items-center gap-2">
                {option.value === "light" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                {option.label}
              </span>
            )}
          />
        </Card>

        {/* Workspace info */}
        <Card>
          <CardHeader title="Workspace" />
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Name</span>
              <span className="text-text-primary">{workspace.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Slug</span>
              <span className="font-mono text-text-primary">
                {workspace.slug}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">ID</span>
              <span className="font-mono text-text-muted">{workspace.id}</span>
            </div>
          </div>
        </Card>

        {/* Coming soon */}
        <Card>
          <CardHeader title="API Keys" />
          <p className="text-sm text-text-muted">
            API key management is coming soon.
          </p>
        </Card>

        <Card>
          <CardHeader title="Members" />
          <p className="text-sm text-text-muted">
            Team member management is coming soon.
          </p>
        </Card>
      </div>
    </div>
  );
}
