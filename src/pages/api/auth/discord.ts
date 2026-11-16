import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { authUrl, randomToken } from "../../../lib/auth";
import { OAUTH_COOKIE, OAUTH_SECONDS, cookieOptions, sign } from "../../../lib/session";
import { isSecure, redirectUri } from "../../../lib/request";

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const clientId = env("DISCORD_CLIENT_ID");
  const secret = env("SESSION_SECRET");
  if (!clientId || !secret || !env("DISCORD_CLIENT_SECRET")) return redirect("/admin/login?error=setup");
  const state = randomToken(16);
  const verifier = randomToken(32);
  cookies.set(OAUTH_COOKIE, sign({ state, verifier }, secret, OAUTH_SECONDS), cookieOptions(isSecure(url), OAUTH_SECONDS));
  return redirect(authUrl({ clientId, redirectUri: redirectUri(url), state, verifier }));
};
