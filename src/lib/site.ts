export interface Pack { id: "mini" | "core"; name: string; usd: number; robux: number; includes: string[] }
export interface Maintenance { enabled: boolean; message: string }
export interface Project { id: string; name: string; service: string; year: number; summary: string; image: string }
/** An empty url means "not set". */
export interface Contact { label: string; url: string }
export interface Announcement { enabled: boolean; text: string; linkLabel: string; linkUrl: string }
export interface Copy { hero: string; intro: string; about1: string; about2: string; contact: string }
export interface Testimonial { id: string; quote: string; name: string; role: string }
export interface SiteData { packs: Pack[]; maintenance: Maintenance; projects: Project[]; testimonials: Testimonial[]; contact: Contact; announcement: Announcement; copy: Copy }

export const DEFAULT_MESSAGE = "We are making some changes and will be back soon.";

export const DEFAULT_SITE: SiteData = {
  packs: [
    { id: "mini", name: "Mini", usd: 29, robux: 2400, includes: ["Custom brand logo", "Brand color palette", "Typography selection", "Visual identity direction", "Brand assets and exports", "Mini brand guidelines"] },
    { id: "core", name: "Core", usd: 49, robux: 5000, includes: ["Custom brand logo", "Logo variations and alternatives", "Complete brand color system", "Typography system", "Supporting visual elements", "Extended brand guidelines", "Full brand asset package"] },
  ],
  maintenance: { enabled: false, message: DEFAULT_MESSAGE },
  projects: [],
  testimonials: [],
  contact: { label: "Contact us", url: "" },
  announcement: { enabled: false, text: "", linkLabel: "", linkUrl: "" },
  copy: {
    hero: "We design brand strategy, identity and digital work for businesses that have something to say.",
    intro: "A brand should tell people who you are and what you do. We remove any design decision that doesn't help with that.",
    about1: "Orion helps businesses build a clear, distinctive brand.",
    about2: "Strategy, identity and digital work happen in the same studio, so the decisions stay consistent from the first idea to the final detail.",
    contact: "The first step is a conversation about the project, so we can scope it.",
  },
};

export const LIMITS = { projects: 24, testimonials: 12, copy: 400, announcement: 160 };

/** Only https links, mailto links (when allowed) and links inside this site. Anything else, like javascript:, is rejected. */
export function safeUrl(value: unknown, opts: { mailto?: boolean; image?: boolean } = {}): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (url === "") return "";
  if (url.length > 500) return null;
  if (opts.image) return /^https:\/\/[^\s]+$/i.test(url) || /^\/uploads\/[A-Za-z0-9._-]+$/.test(url) ? url : null;
  if (/^\/(?![\/\\])[^\s\\]*$/.test(url) || /^#[A-Za-z0-9_-]+$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return url;
    if (opts.mailto && parsed.protocol === "mailto:" && /^mailto:[^\s@]+@[^\s@]+$/.test(url)) return url;
  } catch { /* fall through */ }
  return null;
}

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

  // Sections added later fall back to their defaults when missing, so data saved earlier still loads.
  const d = DEFAULT_SITE;

  let projects: Project[] = d.projects;
  if (raw.projects !== undefined) {
    if (!Array.isArray(raw.projects)) errors.push("Projects must be a list.");
    else {
      if (raw.projects.length > LIMITS.projects) errors.push(`At most ${LIMITS.projects} projects.`);
      const seen = new Set<string>();
      projects = raw.projects.slice(0, LIMITS.projects).map((p, i) => {
        const label = `Project ${i + 1}`;
        const id = typeof p?.id === "string" && /^[a-z0-9-]{1,40}$/.test(p.id) ? p.id : "";
        if (!id || seen.has(id)) errors.push(`${label}: invalid or repeated id.`);
        seen.add(id);
        const name = clean(p?.name, 60);
        if (!name) errors.push(`${label}: name is required.`);
        const year = typeof p?.year === "number" ? p.year : NaN;
        if (!Number.isInteger(year) || year < 1990 || year > 2100) errors.push(`${label}: year must be between 1990 and 2100.`);
        const image = safeUrl(p?.image, { image: true });
        if (image === null) errors.push(`${label}: image must be an https address or an upload.`);
        return { id, name, service: clean(p?.service, 60), year, summary: clean(p?.summary, 300), image: image ?? "" };
      });
    }
  }

  let testimonials: Testimonial[] = d.testimonials;
  if (raw.testimonials !== undefined) {
    if (!Array.isArray(raw.testimonials)) errors.push("Testimonials must be a list.");
    else {
      if (raw.testimonials.length > LIMITS.testimonials) errors.push(`At most ${LIMITS.testimonials} testimonials.`);
      const seen = new Set<string>();
      testimonials = raw.testimonials.slice(0, LIMITS.testimonials).map((t, i) => {
        const label = `Testimonial ${i + 1}`;
        const id = typeof t?.id === "string" && /^[a-z0-9-]{1,40}$/.test(t.id) ? t.id : "";
        if (!id || seen.has(id)) errors.push(`${label}: invalid or repeated id.`);
        seen.add(id);
        const quote = clean(t?.quote, 400);
        const name = clean(t?.name, 60);
        if (!quote) errors.push(`${label}: the quote is required.`);
        if (!name) errors.push(`${label}: the name is required.`);
        return { id, quote, name, role: clean(t?.role, 60) };
      });
    }
  }

  let contact: Contact = d.contact;
  if (raw.contact !== undefined) {
    const url = safeUrl(raw.contact?.url, { mailto: true });
    if (url === null) errors.push("Contact link must start with https:// or mailto:.");
    contact = { label: clean(raw.contact?.label, 40) || d.contact.label, url: url ?? "" };
  }

  let announcement: Announcement = d.announcement;
  if (raw.announcement !== undefined) {
    const a = raw.announcement;
    if (typeof a?.enabled !== "boolean") errors.push("Announcement setting is missing.");
    const linkUrl = safeUrl(a?.linkUrl);
    if (linkUrl === null) errors.push("Announcement link must start with https://, / or #.");
    const text = clean(a?.text, LIMITS.announcement);
    if (a?.enabled === true && !text) errors.push("Announcement text is required while the banner is on.");
    announcement = { enabled: a?.enabled === true, text, linkLabel: clean(a?.linkLabel, 30), linkUrl: linkUrl ?? "" };
  }

  let copy: Copy = d.copy;
  if (raw.copy !== undefined) {
    const c = (raw.copy ?? {}) as Partial<Copy>;
    copy = Object.fromEntries((Object.keys(d.copy) as (keyof Copy)[]).map((key) => {
      if (c[key] !== undefined && typeof c[key] !== "string") errors.push(`Text "${key}" must be text.`);
      return [key, clean(c[key], LIMITS.copy) || d.copy[key]];
    })) as unknown as Copy;
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, data: { packs, maintenance: { enabled: m!.enabled, message }, projects, testimonials, contact, announcement, copy } };
}

export const formatUsd = (usd: number) => `$${Number.isInteger(usd) ? usd : usd.toFixed(2)}`;
export const formatRobux = (robux: number) => `${robux.toLocaleString("en-US")} Robux`;
