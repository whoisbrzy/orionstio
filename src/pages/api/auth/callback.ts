import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { DEFAULT_ADMIN_ID, exchangeCode, isAllowed } from "../../../lib/auth";
import { OAUTH_COOKIE, SESSION_COOKIE, SESSION_SECONDS, cookieOptions, sign, verify } from "../../../lib/session";
import { isSecure, redirectUri } from "../../../lib/request";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const clientId = env("DISCORD_CLIENT_ID");
  const clientSecret = env("DISCORD_CLIENT_SECRET");
  const secret = env("SESSION_SECRET");
  const allowedId = env("ADMIN_DISCORD_ID") ?? DEFAULT_ADMIN_ID;
  if (!clientId || !clientSecret || !secret) return redirect("/admin/login?error=setup");

  const saved = verify<{ state: string; verifier: string }>(cookies.get(OAUTH_COOKIE)?.value, secret);
  cookies.delete(OAUTH_COOKIE, { path: "/" });
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code || !saved || !state || state !== saved.state) return redirect("/admin/login?error=failed");

  let identity;
  try {
    identity = await exchangeCode({ code, clientId, clientSecret, redirectUri: redirectUri(url), verifier: saved.verifier });
  } catch {
    return redirect("/admin/login?error=failed");
  }
  if (!isAllowed(identity, allowedId)) return redirect("/admin/login?error=denied");

  cookies.set(SESSION_COOKIE, sign({ id: identity!.id, name: identity!.name }, secret, SESSION_SECONDS), cookieOptions(isSecure(url), SESSION_SECONDS));
  return redirect("/admin");
};
