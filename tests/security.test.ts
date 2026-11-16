import { describe, expect, it } from "vitest";
import { sign, verify } from "../src/lib/session";
import { DEFAULT_ADMIN_ID, challengeFor, isAllowed, readUser } from "../src/lib/auth";
import { DEFAULT_SITE, parseSite } from "../src/lib/site";

const secret = "test-secret-test-secret-test-secret";
const owner = { id: "1366813770344829131", username: "owner", global_name: "Owner" };

describe("session", () => {
  it("round-trips a signed payload", () => {
    expect(verify<{ id: string }>(sign({ id: "1" }, secret, 60), secret)?.id).toBe("1");
  });
  it("rejects a wrong secret, tampering, expiry and junk", () => {
    const token = sign({ id: "1" }, secret, 60);
    expect(verify(token, "other-secret")).toBeNull();
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ id: "evil", exp: 9999999999 })).toString("base64url");
    expect(verify(`${forged}.${sig}`, secret)).toBeNull();
    expect(verify(`${body}.AAAA`, secret)).toBeNull();
    expect(verify(token, secret, Date.now() + 61_000)).toBeNull();
    expect(verify(undefined, secret)).toBeNull();
    expect(verify("nodots", secret)).toBeNull();
    expect(verify(token, "")).toBeNull();
  });
});

describe("allow list", () => {
  it("allows only the owner's Discord ID", () => {
    expect(DEFAULT_ADMIN_ID).toBe("1366813770344829131");
    expect(isAllowed(readUser(owner), DEFAULT_ADMIN_ID)).toBe(true);
  });
  it("rejects other IDs, near misses, missing config and bad responses", () => {
    expect(isAllowed(readUser({ ...owner, id: "1366813770344829132" }), DEFAULT_ADMIN_ID)).toBe(false);
    expect(isAllowed(readUser({ ...owner, id: "136681377034482913" }), DEFAULT_ADMIN_ID)).toBe(false);
    expect(isAllowed(readUser(owner), undefined)).toBe(false);
    expect(isAllowed(readUser(owner), "")).toBe(false);
    expect(isAllowed(null, DEFAULT_ADMIN_ID)).toBe(false);
    expect(readUser({ id: 1366813770344829131 })).toBeNull();
    expect(readUser({ id: "abc" })).toBeNull();
    expect(readUser(null)).toBeNull();
  });
  it("uses the display name, then the username", () => {
    expect(readUser(owner)?.name).toBe("Owner");
    expect(readUser({ id: owner.id, username: "owner" })?.name).toBe("owner");
  });
  it("computes the PKCE challenge from RFC 7636's example", () => {
    expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("site data", () => {
  const valid = () => structuredClone(DEFAULT_SITE);
  it("accepts the defaults", () => expect(parseSite(valid()).ok).toBe(true));
  it("cleans text and limits lists", () => {
    const data = valid();
    data.packs[0].includes = ["  Logo  ", "", "x".repeat(500)];
    const r = parseSite(data);
    expect(r.ok && r.data.packs[0].includes).toEqual(["Logo", "x".repeat(120)]);
  });
  it("rejects bad prices, empty names and bad shapes", () => {
    for (const change of [
      (d: any) => (d.packs[0].usd = -1),
      (d: any) => (d.packs[0].usd = 1.234),
      (d: any) => (d.packs[1].robux = 10.5),
      (d: any) => (d.packs[1].robux = "abc"),
      (d: any) => (d.packs[1].robux = null),
      (d: any) => (d.packs[0].usd = "29"),
      (d: any) => (d.packs[0].name = "  "),
      (d: any) => (d.packs[0].includes = new Array(13).fill("a")),
      (d: any) => (d.maintenance.enabled = "yes"),
      (d: any) => d.packs.pop(),
    ]) {
      const d = valid();
      change(d);
      expect(parseSite(d).ok).toBe(false);
    }
    expect(parseSite(null).ok).toBe(false);
    expect(parseSite({}).ok).toBe(false);
  });
  it("ignores unknown pack ids and extra fields", () => {
    const d: any = valid();
    d.packs.push({ id: "evil", name: "x", usd: 1, robux: 1, includes: [] });
    d.admin = true;
    const r = parseSite(d);
    expect(r.ok && r.data.packs.map((p) => p.id)).toEqual(["mini", "core"]);
    expect(r.ok && "admin" in r.data).toBe(false);
  });
  it("falls back to the default maintenance message", () => {
    const d = valid(); d.maintenance.message = "   ";
    const r = parseSite(d);
    expect(r.ok && r.data.maintenance.message).toBe(DEFAULT_SITE.maintenance.message);
  });
});

import { LIMITS, safeUrl } from "../src/lib/site";

describe("links", () => {
  it("allows https, site paths, anchors and (when allowed) mailto", () => {
    expect(safeUrl("https://discord.gg/abc")).toBe("https://discord.gg/abc");
    expect(safeUrl("/work")).toBe("/work");
    expect(safeUrl("#contact")).toBe("#contact");
    expect(safeUrl("")).toBe("");
    expect(safeUrl("mailto:hi@orion.test", { mailto: true })).toBe("mailto:hi@orion.test");
  });
  it("rejects script, data, http, protocol-relative and spaced links", () => {
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "http://x.test", "//evil.test", "https://a b.test", "ftp://x.test", "mailto:a@b.c", "/\\evil.test", "/\\/evil.test", 5, null])
      expect(safeUrl(bad as any)).toBeNull();
    expect(safeUrl("mailto:bad", { mailto: true })).toBeNull();
  });
  it("limits images to https or the local uploads folder", () => {
    expect(safeUrl("https://x.supabase.co/a.webp", { image: true })).toBe("https://x.supabase.co/a.webp");
    expect(safeUrl("/uploads/a1-b.webp", { image: true })).toBe("/uploads/a1-b.webp");
    expect(safeUrl("/uploads/../secret", { image: true })).toBeNull();
    expect(safeUrl("/other.png", { image: true })).toBeNull();
    expect(safeUrl("javascript:1", { image: true })).toBeNull();
  });
});

describe("extended site data", () => {
  const base = () => structuredClone(DEFAULT_SITE) as any;
  const project = (over = {}) => ({ id: "acme", name: "Acme", service: "Brand identity", year: 2026, summary: "A brand.", image: "", ...over });

  it("loads data saved before these sections existed", () => {
    const old = base(); delete old.projects; delete old.contact; delete old.announcement; delete old.copy;
    const r = parseSite(old);
    expect(r.ok && r.data.copy.hero).toBe(DEFAULT_SITE.copy.hero);
    expect(r.ok && r.data.projects).toEqual([]);
  });
  it("accepts valid projects and keeps their order", () => {
    const d = base(); d.projects = [project({ id: "b", name: "B" }), project({ id: "a", name: "A" })];
    const r = parseSite(d);
    expect(r.ok && r.data.projects.map((p) => p.id)).toEqual(["b", "a"]);
  });
  it("rejects bad projects", () => {
    for (const bad of [project({ name: " " }), project({ year: 1900 }), project({ year: "2026" }), project({ id: "Bad Id" }), project({ image: "javascript:x" }), project({ image: "http://x.test/a.png" })]) {
      const d = base(); d.projects = [bad]; expect(parseSite(d).ok).toBe(false);
    }
    const dup = base(); dup.projects = [project(), project()]; expect(parseSite(dup).ok).toBe(false);
    const many = base(); many.projects = Array.from({ length: LIMITS.projects + 1 }, (_, i) => project({ id: `p${i}` })); expect(parseSite(many).ok).toBe(false);
  });
  it("validates contact, announcement and text", () => {
    const d = base(); d.contact = { label: "Discord", url: "https://discord.gg/x" }; expect(parseSite(d).ok).toBe(true);
    d.contact = { label: "x", url: "javascript:alert(1)" }; expect(parseSite(d).ok).toBe(false);
    const a = base(); a.announcement = { enabled: true, text: "", linkLabel: "", linkUrl: "" }; expect(parseSite(a).ok).toBe(false);
    a.announcement = { enabled: true, text: "Open for projects", linkLabel: "See work", linkUrl: "/work" }; expect(parseSite(a).ok).toBe(true);
    a.announcement.linkUrl = "javascript:1"; expect(parseSite(a).ok).toBe(false);
    const c = base(); c.copy.hero = "  "; const r = parseSite(c);
    expect(r.ok && r.data.copy.hero).toBe(DEFAULT_SITE.copy.hero);
    c.copy.hero = 5; expect(parseSite(c).ok).toBe(false);
  });
});

import { MAX_IMAGE_BYTES, sniffImage } from "../src/lib/upload";

describe("image sniffing", () => {
  const pad = (head: number[]) => new Uint8Array([...head, ...new Array(20).fill(0)]);
  it("recognises PNG, JPEG and WebP by their first bytes", () => {
    expect(sniffImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe("png");
    expect(sniffImage(pad([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0]))?.ext).toBe("webp");
  });
  it("rejects HTML, SVG, GIF, empty and tiny input", () => {
    const text = (t: string) => new TextEncoder().encode(t.padEnd(40, " "));
    expect(sniffImage(text("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImage(text("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImage(text("GIF89a"))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
    expect(sniffImage(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
  it("limits uploads to 4 MB", () => expect(MAX_IMAGE_BYTES).toBe(4194304));
});

describe("testimonials", () => {
  const base = () => structuredClone(DEFAULT_SITE) as any;
  const t = (over = {}) => ({ id: "t1", quote: "Great work.", name: "Sam", role: "Founder, Acme", ...over });
  it("defaults to none, and older data still loads", () => {
    const old = base(); delete old.testimonials;
    const r = parseSite(old);
    expect(r.ok && r.data.testimonials).toEqual([]);
  });
  it("accepts valid testimonials in order and trims text", () => {
    const d = base(); d.testimonials = [t({ id: "b", quote: "  Two  " }), t({ id: "a" })];
    const r = parseSite(d);
    expect(r.ok && r.data.testimonials.map((x) => x.id)).toEqual(["b", "a"]);
    expect(r.ok && r.data.testimonials[0].quote).toBe("Two");
  });
  it("allows an empty role but not an empty quote or name", () => {
    const ok = base(); ok.testimonials = [t({ role: "" })]; expect(parseSite(ok).ok).toBe(true);
    for (const bad of [t({ quote: " " }), t({ name: "" }), t({ id: "Bad Id" }), t({ quote: 5 })]) {
      const d = base(); d.testimonials = [bad]; expect(parseSite(d).ok).toBe(false);
    }
  });
  it("rejects repeated ids, too many, and non-lists", () => {
    const dup = base(); dup.testimonials = [t(), t()]; expect(parseSite(dup).ok).toBe(false);
    const many = base(); many.testimonials = Array.from({ length: LIMITS.testimonials + 1 }, (_, i) => t({ id: `t${i}` })); expect(parseSite(many).ok).toBe(false);
    const bad = base(); bad.testimonials = "x"; expect(parseSite(bad).ok).toBe(false);
  });
  it("cuts overlong quotes to 400 characters", () => {
    const d = base(); d.testimonials = [t({ quote: "x".repeat(900) })];
    const r = parseSite(d); expect(r.ok && r.data.testimonials[0].quote.length).toBe(400);
  });
});
