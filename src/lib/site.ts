export interface Pack { id: "mini" | "core"; name: string; usd: number; robux: number; includes: string[] }
export interface Maintenance { enabled: boolean; message: string }
export interface SiteData { packs: Pack[]; maintenance: Maintenance }

export const DEFAULT_MESSAGE = "We are making some changes and will be back soon.";

export const DEFAULT_SITE: SiteData = {
  packs: [
    { id: "mini", name: "Mini", usd: 29, robux: 2400, includes: ["Custom brand logo", "Brand color palette", "Typography selection", "Visual identity direction", "Brand assets and exports", "Mini brand guidelines"] },
    { id: "core", name: "Core", usd: 49, robux: 5000, includes: ["Custom brand logo", "Logo variations and alternatives", "Complete brand color system", "Typography system", "Supporting visual elements", "Extended brand guidelines", "Full brand asset package"] },
  ],
  maintenance: { enabled: false, message: DEFAULT_MESSAGE },
};

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

/** Validate untrusted input. Returns the clean data or a list of errors. */
export function parseSite(input: unknown): { ok: true; data: SiteData } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const raw = input as Partial<SiteData> | null;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.packs)) return { ok: false, errors: ["Missing packs."] };

  const packs: Pack[] = DEFAULT_SITE.packs.map((base) => {
    const given = raw.packs!.find((p) => p?.id === base.id);
    if (!given) { errors.push(`Missing the ${base.name} pack.`); return base; }
    const name = clean(given.name, 40);
    if (!name) errors.push(`${base.name}: name is required.`);
    const usd = typeof given.usd === "number" ? given.usd : NaN;
    if (!Number.isFinite(usd) || usd < 0 || usd > 1_000_000 || Math.abs(usd * 100 - Math.round(usd * 100)) > 1e-6)
      errors.push(`${base.name}: dollars must be 0 or more, with at most 2 decimals.`);
    const robux = typeof given.robux === "number" ? given.robux : NaN;
    if (!Number.isInteger(robux) || robux < 0 || robux > 100_000_000) errors.push(`${base.name}: Robux must be a whole number, 0 or more.`);
    const list = Array.isArray(given.includes) ? given.includes : [];
    if (list.length > 12) errors.push(`${base.name}: at most 12 items.`);
    const includes = list.map((item) => clean(item, 120)).filter(Boolean).slice(0, 12);
    return { id: base.id, name, usd: Math.round(usd * 100) / 100, robux, includes };
  });

  const m = raw.maintenance;
  if (!m || typeof m.enabled !== "boolean") errors.push("Maintenance setting is missing.");
  const message = clean(m?.message, 300) || DEFAULT_MESSAGE;

  if (errors.length) return { ok: false, errors };
  return { ok: true, data: { packs, maintenance: { enabled: m!.enabled, message } } };
}

export const formatUsd = (usd: number) => `$${Number.isInteger(usd) ? usd : usd.toFixed(2)}`;
export const formatRobux = (robux: number) => `${robux.toLocaleString("en-US")} Robux`;
