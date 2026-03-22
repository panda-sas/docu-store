import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import open from "open";

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const FIXED_CALLBACK_PORT = 18549; // Fixed port for OAuth redirect URI registration

/** HTML served at the callback URL — extracts hash fragment and POSTs to local server. */
const CALLBACK_HTML = `<!DOCTYPE html>
<html><head><title>docu-store login</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#111;color:#eee}p{font-size:1.1rem}</style>
</head><body>
<p id="status">Completing login...</p>
<script>
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const token = params.get('id_token');
const nonce = params.get('nonce');
if (token) {
  fetch('/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({token, nonce: nonce || undefined})
  }).then(r => {
    if (r.ok) {
      document.getElementById('status').textContent = 'Login successful! You can close this tab.';
    } else {
      r.json().then(e => {
        document.getElementById('status').textContent = 'Login failed: ' + (e.error || r.statusText);
      });
    }
  }).catch(() => {
    document.getElementById('status').textContent = 'Login failed. Please try again.';
  });
} else {
  document.getElementById('status').textContent = 'No token received. Please try again.';
}
</script>
</body></html>`;

interface OAuthResult {
  idpToken: string;
}

/** Provider-specific login URL builders. */
const PROVIDER_CONFIGS: Record<
  string,
  (opts: { sentinelUrl: string; callbackUrl: string; nonce: string; googleClientId?: string }) => string
> = {
  github: ({ sentinelUrl, callbackUrl, nonce }) =>
    `${sentinelUrl.replace(/\/$/, "")}/authz/idp/github/login` +
    `?redirect_uri=${encodeURIComponent(callbackUrl)}&nonce=${nonce}`,

  google: ({ callbackUrl, nonce, googleClientId }) => {
    if (!googleClientId) {
      throw new Error(
        "Google login requires a client ID. Set it with:\n" +
        "  docu config set google-client-id YOUR_GOOGLE_CLIENT_ID\n" +
        "  or: export DOCU_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID",
      );
    }
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: callbackUrl,
      response_type: "id_token",
      scope: "openid email profile",
      nonce,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },
};

/**
 * Start a local HTTP server, open the browser to the IdP login,
 * and wait for the callback with the IdP token.
 *
 * - GitHub: routes through Sentinel's server-side proxy (/authz/idp/github/login)
 * - Google: goes directly to Google's OIDC implicit flow (id_token in hash)
 */
export async function startOAuthFlow(
  sentinelUrl: string,
  provider: string,
  googleClientId?: string,
): Promise<OAuthResult> {
  const nonce = randomBytes(16).toString("base64url");

  return new Promise<OAuthResult>((resolvePromise, rejectPromise) => {
    let settled = false;

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.method === "GET" && req.url?.startsWith("/callback")) {
        // Serve the callback HTML that extracts the token from the URL hash
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(CALLBACK_HTML);
        return;
      }

      if (req.method === "POST" && req.url === "/token") {
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const data = JSON.parse(body) as { token?: string; nonce?: string };

            // Validate nonce if present (GitHub/Sentinel includes it in the hash;
            // Google OIDC embeds it inside the JWT, so it's not in the hash).
            if (data.nonce && data.nonce !== nonce) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "nonce mismatch" }));
              return;
            }

            if (!data.token) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "missing token" }));
              return;
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));

            settled = true;
            cleanup();
            resolvePromise({ idpToken: data.token });
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "invalid JSON" }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        rejectPromise(new Error("Login timed out after 5 minutes"));
      }
    }, LOGIN_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeout);
      server.close();
    }

    // Listen on fixed port so OAuth redirect URIs can be pre-registered
    server.listen(FIXED_CALLBACK_PORT, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        settled = true;
        cleanup();
        rejectPromise(new Error("Failed to start callback server"));
        return;
      }

      const port = addr.port;
      const callbackUrl = `http://localhost:${port}/callback`;

      const buildUrl = PROVIDER_CONFIGS[provider];
      if (!buildUrl) {
        settled = true;
        cleanup();
        rejectPromise(
          new Error(
            `Unsupported provider "${provider}". Supported: ${Object.keys(PROVIDER_CONFIGS).join(", ")}`,
          ),
        );
        return;
      }

      let loginUrl: string;
      try {
        loginUrl = buildUrl({ sentinelUrl, callbackUrl, nonce, googleClientId });
      } catch (err) {
        settled = true;
        cleanup();
        rejectPromise(err);
        return;
      }

      console.log(`Opening browser for ${provider} login...`);
      console.log(`If the browser doesn't open, visit:\n  ${loginUrl}\n`);

      open(loginUrl).catch(() => {
        // Browser open failed — user can manually visit the URL
      });
    });
  });
}
