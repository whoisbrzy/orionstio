import { env } from "./env";

/** The public address of the site, used to build the Google redirect address. */
export function siteOrigin(url: URL): string {
  return (env("SITE_URL") ?? url.origin).replace(/\/$/, "");
}
export const redirectUri = (url: URL) => `${siteOrigin(url)}/api/auth/callback`;
export const isSecure = (url: URL) => siteOrigin(url).startsWith("https://");

/** For JSON writes: the browser must say the request came from this site. */
export function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === siteOrigin(url);
}
