import { defineMiddleware } from "astro:middleware";
import { env } from "./lib/env";
import { SESSION_COOKIE, verify } from "./lib/session";
import { readSite } from "./lib/store";
import { maintenanceHtml } from "./lib/maintenance";

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, locals } = context;
  const secret = env("SESSION_SECRET") ?? "";
  const allowed = env("ADMIN_EMAIL")?.trim().toLowerCase();
  const session = verify<{ email: string }>(cookies.get(SESSION_COOKIE)?.value, secret);
  // Re-check the email on every request, so changing ADMIN_EMAIL locks out the old account.
  locals.admin = session && allowed && session.email === allowed ? session.email : null;

  const path = url.pathname;
  const isAdminArea = path === "/admin" || path.startsWith("/admin/");
  const isAdminApi = path.startsWith("/api/admin/");
  const isAuthRoute = path.startsWith("/api/auth/");

  if (isAdminApi && !locals.admin) {
    return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401, headers: { "content-type": "application/json" } });
  }
  if (isAdminArea && path !== "/admin/login" && !locals.admin) {
    return new Response(null, { status: 302, headers: { location: "/admin/login" } });
  }

  // Maintenance mode covers the public pages. The signed-in admin still sees the real site.
  if (!isAdminArea && !isAdminApi && !isAuthRoute && !locals.admin) {
    const { maintenance } = await readSite();
    if (maintenance.enabled) {
      return new Response(maintenanceHtml(maintenance.message), {
        status: 503,
        headers: { "content-type": "text/html; charset=utf-8", "retry-after": "3600", "cache-control": "no-store" },
      });
    }
  }

  const response = await next();
  if (isAdminArea || isAdminApi || isAuthRoute) response.headers.set("cache-control", "no-store");
  return response;
});
