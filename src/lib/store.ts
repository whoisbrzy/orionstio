import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { env } from "./env";
import { DEFAULT_SITE, parseSite, type SiteData } from "./site";

const KEY = "orion:site";
const TABLE = "site_data";

/**
 * Vercel's Supabase integration lets you pick a prefix, so the names can be SUPABASE_URL,
 * ORION_SUPABASE_URL, ORION_URL and so on. Find the values by name first, then by shape.
 */
const SUPABASE_HOST = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i;
const names = () => Object.keys(process.env);

function findUrl(): string | undefined {
  const exact = env("SUPABASE_URL");
  if (exact) return exact;
  const candidates = names().filter((key) => !key.includes("POSTGRES") && SUPABASE_HOST.test(process.env[key] ?? ""));
  // Prefer a name that is not the browser-facing copy, though both hold the same address.
  const key = candidates.find((k) => !k.includes("NEXT_PUBLIC")) ?? candidates[0];
  return key ? env(key) : undefined;
}

function findServiceKey(): string | undefined {
  const exact = env("SUPABASE_SERVICE_ROLE_KEY");
  if (exact) return exact;
  const key = names().find((k) => /SERVICE_ROLE/i.test(k) && !k.includes("NEXT_PUBLIC"));
  return key ? env(key) : undefined;
}

const base = () => findUrl()?.replace(/\/$/, "");
const serviceKey = () => findServiceKey();

/** Names only, never values, to help fix a missing setting. */
const seenNames = () => names().filter((k) => /SUPABASE|ORION|SERVICE_ROLE/i.test(k)).sort().join(", ") || "none";
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
  if (process.env.VERCEL) throw new Error(`Storage is not connected. Found ${base() ? "the Supabase URL" : "no Supabase URL"} and ${serviceKey() ? "a service role key" : "no service role key"}. Variable names seen: ${seenNames()}. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to this Vercel project and redeploy.`);
  await mkdir(dirname(devFile), { recursive: true });
  await writeFile(devFile, JSON.stringify(data));
}
