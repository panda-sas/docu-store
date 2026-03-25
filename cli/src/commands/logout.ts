import { clearCredentials, loadCredentials } from "../auth/credentials.js";
import * as log from "../utils/logger.js";

export function logoutCommand(): void {
  const creds = loadCredentials();
  if (!creds) {
    log.info("Not logged in.");
    return;
  }

  clearCredentials();
  log.success("Logged out. Credentials removed.");
}
