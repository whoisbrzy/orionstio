import type { APIRoute } from "astro";
import { SESSION_COOKIE } from "../../../lib/session";

// POST only, so another site cannot sign the admin out with a link or image.
export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return redirect("/admin/login", 303);
};
