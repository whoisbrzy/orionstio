import type { APIRoute } from "astro";
import { SESSION_COOKIE } from "../../../lib/session";
import { sameOrigin } from "../../../lib/request";

// POST only, and only from this site, so another site cannot sign the admin out.
export const POST: APIRoute = ({ cookies, redirect, request, url }) => {
  if (!sameOrigin(request, url)) return new Response("Request blocked.", { status: 403 });
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return redirect("/admin/login", 303);
};
