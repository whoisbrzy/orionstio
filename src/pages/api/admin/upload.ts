import type { APIRoute } from "astro";
import { saveImage } from "../../../lib/store";
import { sameOrigin } from "../../../lib/request";
import { MAX_IMAGE_BYTES, sniffImage } from "../../../lib/upload";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const POST: APIRoute = async ({ request, url }) => {
  if (!sameOrigin(request, url)) return json({ error: "Request blocked." }, 403);
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES + 1024) return json({ error: "Image is larger than 4 MB." }, 413);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) return json({ error: "Image is larger than 4 MB." }, 413);
  const kind = sniffImage(bytes);
  if (!kind) return json({ error: "Use a PNG, JPEG or WebP image." }, 415);
  try {
    return json({ url: await saveImage(bytes, kind) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not upload." }, 500);
  }
};
