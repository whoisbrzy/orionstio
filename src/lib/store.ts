import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { env } from "./env";
import { DEFAULT_SITE, parseSite, type SiteData } from "./site";

const KEY = "orion:site";
const TABLE = "site_data";

/**
 * Vercel's Supabase integration adds a prefix of your choice, so the variable can be
 * SUPABASE_URL or, with a prefix, ORION_SUPABASE_URL. Accept either.
 */
function findEnv(name: string): string | undefined {
  const exact = env(name);
  if (exact) return exact;
  const match = Object.keys(process.env).find((key) => key.endsWith(`_${name}`) && !key.includes("NEXT_PUBLIC"));
  return match ? env(match) : undefined;
}

const base = () => findEnv("SUPABASE_URL")?.replace(/\/$/, "");
const serviceKey = () => findEnv("SUPABASE_SERVICE_ROLE_KEY");
const hasSupabase = () => Boolean(base() && serviceKey());

export const storageMode = () => hasSupabase() ? "supabase" : "file";

function headers(extra: Record<string, string> = {}) {
  const key = serviceKey()!;
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}

// Local development has no Supabase, so it keeps the data in a git-ignored file.
const devFile = join(process.cwd(), ".data", "site.json");

export async function readSite(): Promise<SiteData> {
  try {
    let value: unknown;
    if (hasSupabase()) {
      const response = await fetch(`${base()}/rest/v1/${TABLE}?key=eq.${encodeURIComponent(KEY)}&select=value`, { headers: headers() });
      if (!response.ok) throw new Error(`Storage request failed (${response.status}).`);
      const rows = await response.json() as { value: unknown }[];
      value = rows[0]?.value;
    } else {
      value = JSON.parse(await readFile(devFile, "utf8"));
    }
    if (!value) return DEFAULT_SITE;
    const parsed = parseSite(value);
    return parsed.ok ? parsed.data : DEFAULT_SITE;
  } catch {
    return DEFAULT_SITE;
  }
}

export async function writeSite(data: SiteData): Promise<void> {
  if (hasSupabase()) {
    const response = await fetch(`${base()}/rest/v1/${TABLE}?on_conflict=key`, {
      method: "POST",
      headers: headers({ prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ key: KEY, value: data, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`Could not save to Supabase (${response.status}). Check the table exists and the service role key is right.`);
    return;
  }
  if (process.env.VERCEL) throw new Error("Storage is not connected. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to this Vercel project.");
  await mkdir(dirname(devFile), { recursive: true });
  await writeFile(devFile, JSON.stringify(data));
}
