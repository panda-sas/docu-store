const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleTokens {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/**
 * Exchange an authorization code for tokens using PKCE.
 * Desktop app clients require client_secret (it's not truly secret — ships with the app).
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    let detail: string;
    try {
      const err = await resp.json();
      detail = (err as { error_description?: string; error?: string }).error_description ||
        (err as { error?: string }).error || resp.statusText;
    } catch {
      detail = resp.statusText;
    }
    throw new Error(`Google token exchange failed: ${detail}`);
  }

  return (await resp.json()) as GoogleTokens;
}

/**
 * Use a refresh token to get a new id_token from Google.
 */
export async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ id_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    let detail: string;
    try {
      const err = await resp.json();
      detail = (err as { error_description?: string; error?: string }).error_description ||
        (err as { error?: string }).error || resp.statusText;
    } catch {
      detail = resp.statusText;
    }
    throw new Error(`Google token refresh failed: ${detail}`);
  }

  const data = (await resp.json()) as { id_token: string; expires_in: number };
  return { id_token: data.id_token, expires_in: data.expires_in };
}
