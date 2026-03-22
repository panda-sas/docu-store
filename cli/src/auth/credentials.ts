import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Credentials {
  idp_token: string;
  authz_token: string;
  provider: string;
  workspace_id: string;
  workspace_slug: string | null;
  user_email: string | null;
  user_name: string | null;
  expires_at: number; // unix seconds
}

const REFRESH_BUFFER_SECONDS = 30;

function credentialsDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  return join(xdg || join(homedir(), ".config"), "docu-store");
}

function credentialsPath(): string {
  return join(credentialsDir(), "credentials.json");
}

export function loadCredentials(): Credentials | null {
  const path = credentialsPath();
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    if (!data.idp_token || !data.authz_token) return null;
    return data as Credentials;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: Credentials): void {
  const dir = credentialsDir();
  mkdirSync(dir, { recursive: true });
  const path = credentialsPath();
  writeFileSync(path, JSON.stringify(creds, null, 2) + "\n", { mode: 0o600 });
}

export function clearCredentials(): void {
  const path = credentialsPath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export function isExpired(creds: Credentials): boolean {
  return Date.now() / 1000 > creds.expires_at - REFRESH_BUFFER_SECONDS;
}
