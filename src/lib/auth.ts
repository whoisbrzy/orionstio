import { createHash, randomBytes } from "node:crypto";

const AUTH_URL = "https://discord.com/oauth2/authorize";
const TOKEN_URL = "https://discord.com/api/oauth2/token";
const USER_URL = "https://discord.com/api/users/@me";

/** The one Discord account allowed into /admin. Override with ADMIN_DISCORD_ID. */
export const DEFAULT_ADMIN_ID = "1366813770344829131";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const challengeFor = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export function authUrl(opts: { clientId: string; redirectUri: string; state: string; verifier: string }) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "identify",
    state: opts.state,
    code_challenge: challengeFor(opts.verifier),
    code_challenge_method: "S256",
    prompt: "consent",
  }).toString();
  return url.toString();
}

export interface DiscordIdentity { id: string; name: string }

/** Parse Discord's /users/@me response. Snowflake IDs stay strings. */
export function readUser(data: unknown): DiscordIdentity | null {
  const user = data as { id?: unknown; username?: unknown; global_name?: unknown } | null;
  if (!user || typeof user.id !== "string" || !/^\d{15,25}$/.test(user.id)) return null;
  const name = typeof user.global_name === "string" && user.global_name ? user.global_name : typeof user.username === "string" ? user.username : user.id;
  return { id: user.id, name: name.slice(0, 80) };
}

/** True only for the single allowed Discord user ID. */
export function isAllowed(identity: DiscordIdentity | null, allowedId: string | undefined): boolean {
  return Boolean(identity && allowedId && identity.id === allowedId.trim());
}

export async function exchangeCode(opts: { code: string; clientId: string; clientSecret: string; redirectUri: string; verifier: string }): Promise<DiscordIdentity | null> {
  const token = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
      code_verifier: opts.verifier,
    }),
  });
  if (!token.ok) return null;
  const { access_token } = await token.json() as { access_token?: string };
  if (!access_token) return null;
  const me = await fetch(USER_URL, { headers: { authorization: `Bearer ${access_token}` } });
  if (!me.ok) return null;
  return readUser(await me.json());
}
