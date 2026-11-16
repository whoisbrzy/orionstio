import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { exchangeCode, isAllowed } from "../../../lib/auth";
import { OAUTH_COOKIE, SESSION_COOKIE, SESSION_SECONDS, cookieOptions, sign, verify } from "../../../lib/session";
import { isSecure, redirectUri } from "../../../lib/request";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const clientId = env("GOOGLE_CLIENT_ID");
  const clientSecret = env("GOOGLE_CLIENT_SECRET");
  const secret = env("SESSION_SECRET");
  const allowedEmail = env("ADMIN_EMAIL");
  if (!clientId || !clientSecret || !secret || !allowedEmail) return redirect("/admin/login?error=setup");

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
  if (!isAllowed(identity, allowedEmail, clientId)) return redirect("/admin/login?error=denied");

  cookies.set(SESSION_COOKIE, sign({ email: identity!.email.toLowerCase() }, secret, SESSION_SECONDS), cookieOptions(isSecure(url), SESSION_SECONDS));
  return redirect("/admin");
};
