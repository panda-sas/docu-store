import { isExpired, loadCredentials } from "../auth/credentials.js";
import * as log from "../utils/logger.js";

export function whoamiCommand(): void {
  const creds = loadCredentials();
  if (!creds) {
    log.error("Not logged in. Run: docu login");
    process.exit(1);
  }

  const expired = isExpired(creds);
  const expiresAt = new Date(creds.expires_at * 1000).toLocaleString();

  console.log(`  Email:     ${creds.user_email || "unknown"}`);
  console.log(`  Name:      ${creds.user_name || "unknown"}`);
  console.log(`  Provider:  ${creds.provider}`);
  console.log(`  Workspace: ${creds.workspace_slug || creds.workspace_id}`);
  console.log(`  Token:     ${expired ? "expired" : "valid"} (expires ${expiresAt})`);

  if (expired && !creds.idp_token) {
    log.warn("Token expired and no IdP token for refresh. Run: docu login");
  } else if (expired) {
    log.info("Token expired but will auto-refresh on next API call.");
  }
}
