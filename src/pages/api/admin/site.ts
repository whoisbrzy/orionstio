import type { APIRoute } from "astro";
import { parseSite } from "../../../lib/site";
import { readSite, writeSite } from "../../../lib/store";
import { sameOrigin } from "../../../lib/request";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const GET: APIRoute = async () => json(await readSite());

export const PUT: APIRoute = async ({ request, url }) => {
  if (!sameOrigin(request, url)) return json({ error: "Request blocked." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Send JSON." }, 415);
  let input: unknown;
  try { input = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const parsed = parseSite(input);
  if (!parsed.ok) return json({ errors: parsed.errors }, 422);
  try {
    await writeSite(parsed.data);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not save." }, 500);
  }
  return json(parsed.data);
};
