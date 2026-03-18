import {
  SentinelAuthz,
  AuthzLocalStorageStore,
  IdpConfigs,
} from "@sentinel-auth/js";
import type { IdpConfig } from "@sentinel-auth/js";

const SENTINEL_URL =
  process.env.NEXT_PUBLIC_SENTINEL_URL || "http://localhost:9003";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "";

const githubIdpConfig: IdpConfig = {
  clientId: GITHUB_CLIENT_ID,
  authorizationUrl: `${SENTINEL_URL}/authz/idp/github/login`,
  scopes: ["read:user", "user:email"],
  responseType: "code",
};

/** Lazy singleton — avoids localStorage access during SSR/prerendering. */
let _client: SentinelAuthz | null = null;

export function getAuthzClient(): SentinelAuthz {
  if (!_client) {
    _client = new SentinelAuthz({
      sentinelUrl: SENTINEL_URL,
      storage: new AuthzLocalStorageStore(),
      idps: {
        google: IdpConfigs.google(GOOGLE_CLIENT_ID),
        github: githubIdpConfig,
      },
    });
  }
  return _client;
}
