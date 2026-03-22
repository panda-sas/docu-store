const CLI_ORIGIN = "docu-cli://localhost";

export interface SentinelUser {
  id: string;
  email: string;
  name: string;
}

export interface SentinelWorkspace {
  id: string;
  slug: string;
  name: string;
  role: string;
}

export interface ResolveResult {
  user: SentinelUser;
  workspaces?: SentinelWorkspace[];
  workspace?: SentinelWorkspace;
  authz_token?: string;
  expires_in?: number;
}

export class SentinelError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "SentinelError";
  }
}

/**
 * Call Sentinel's /authz/resolve endpoint using Origin-based auth (no service key).
 *
 * - Without workspace_id: returns user + available workspaces
 * - With workspace_id: returns user + workspace + authz_token
 */
export async function resolve(
  sentinelUrl: string,
  idpToken: string,
  provider: string,
  workspaceId?: string,
): Promise<ResolveResult> {
  const body: Record<string, string> = {
    idp_token: idpToken,
    provider,
  };
  if (workspaceId) {
    body.workspace_id = workspaceId;
  }

  const resp = await fetch(`${sentinelUrl.replace(/\/$/, "")}/authz/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: CLI_ORIGIN,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    let detail: string;
    try {
      const err = await resp.json();
      detail = (err as { detail?: string }).detail || resp.statusText;
    } catch {
      detail = resp.statusText;
    }
    throw new SentinelError(detail, resp.status);
  }

  return (await resp.json()) as ResolveResult;
}
