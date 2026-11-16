import { createHash, randomBytes } from "node:crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const challengeFor = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export function authUrl(opts: { clientId: string; redirectUri: string; state: string; verifier: string }) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid email",
    state: opts.state,
    code_challenge: challengeFor(opts.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export interface GoogleIdentity { email: string; emailVerified: boolean; audience: string; issuer: string }

/** Read the claims from an ID token. Only safe for a token that came straight from Google's token endpoint over TLS. */
export function readIdToken(idToken: string): GoogleIdentity | null {
  try {
    const claims = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    if (typeof claims.email !== "string") return null;
    return {
      email: claims.email,
      emailVerified: claims.email_verified === true || claims.email_verified === "true",
      audience: String(claims.aud ?? ""),
      issuer: String(claims.iss ?? ""),
    };
  } catch {
    return null;
  }
}

/** True only for the single allowed account, with a verified email, issued to this app by Google. */
export function isAllowed(identity: GoogleIdentity | null, allowedEmail: string | undefined, clientId: string): boolean {
  if (!identity || !allowedEmail) return false;
  const issuerOk = identity.issuer === "https://accounts.google.com" || identity.issuer === "accounts.google.com";
  return issuerOk && identity.audience === clientId && identity.emailVerified &&
    identity.email.trim().toLowerCase() === allowedEmail.trim().toLowerCase();
}

export async function exchangeCode(opts: { code: string; clientId: string; clientSecret: string; redirectUri: string; verifier: string }) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      grant_type: "authorization_code",
      code_verifier: opts.verifier,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json() as { id_token?: string };
  return data.id_token ? readIdToken(data.id_token) : null;
}
