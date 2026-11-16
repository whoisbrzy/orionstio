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
