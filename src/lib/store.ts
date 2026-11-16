import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { env } from "./env";
import { DEFAULT_SITE, parseSite, type SiteData } from "./site";

const KEY = "orion:site";

const restUrl = () => env("KV_REST_API_URL") ?? env("UPSTASH_REDIS_REST_URL");
const restToken = () => env("KV_REST_API_TOKEN") ?? env("UPSTASH_REDIS_REST_TOKEN");

async function redis(command: unknown[]): Promise<unknown> {
  const response = await fetch(restUrl()!, {
    method: "POST",
    headers: { authorization: `Bearer ${restToken()}`, "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`Storage request failed (${response.status}).`);
  const body = await response.json() as { result?: unknown; error?: string };
  if (body.error) throw new Error(body.error);
  return body.result;
}

// Local development has no Redis, so it keeps the data in a git-ignored file.
const devFile = join(process.cwd(), ".data", "site.json");
const hasRedis = () => Boolean(restUrl() && restToken());

export const storageMode = () => hasRedis() ? "redis" : "file";

export async function readSite(): Promise<SiteData> {
  try {
    const text = hasRedis() ? await redis(["GET", KEY]) as string | null : await readFile(devFile, "utf8");
    if (!text) return DEFAULT_SITE;
    const parsed = parseSite(JSON.parse(text));
    return parsed.ok ? parsed.data : DEFAULT_SITE;
  } catch {
    return DEFAULT_SITE;
  }
}

export async function writeSite(data: SiteData): Promise<void> {
  const text = JSON.stringify(data);
  if (hasRedis()) { await redis(["SET", KEY, text]); return; }
  if (process.env.VERCEL) throw new Error("Storage is not connected. Add an Upstash Redis database to this Vercel project.");
  await mkdir(dirname(devFile), { recursive: true });
  await writeFile(devFile, text);
}
