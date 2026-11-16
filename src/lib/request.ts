import { env } from "./env";

export const PRODUCTION_URL = "https://orionstdio.vercel.app";

/**
 * The public address of the site, used for the Discord redirect address and the same-origin check.
 * On Vercel the request URL can show an internal host such as https://localhost, so it is not trusted there.
 */
export function siteOrigin(url: URL): string {
  const fallback = process.env.VERCEL ? PRODUCTION_URL : url.origin;
  return (env("SITE_URL") ?? fallback).replace(/\/$/, "");
}
export const redirectUri = (url: URL) => `${siteOrigin(url)}/api/auth/callback`;
export const isSecure = (url: URL) => siteOrigin(url).startsWith("https://");

/** For JSON writes: the browser must say the request came from this site. */
export function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === siteOrigin(url);
}
