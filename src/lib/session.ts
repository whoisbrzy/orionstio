import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "orion_session";
export const OAUTH_COOKIE = "orion_oauth";
export const SESSION_SECONDS = 60 * 60 * 8;
export const OAUTH_SECONDS = 60 * 10;

const b64 = (input: string | Buffer) => Buffer.from(input).toString("base64url");

function mac(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest();
}

/** Sign a JSON payload with an expiry. Format: base64url(json).base64url(hmac). */
export function sign(payload: Record<string, unknown>, secret: string, ttlSeconds: number, now = Date.now()): string {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(now / 1000) + ttlSeconds }));
  return `${body}.${b64(mac(secret, body))}`;
}

/** Return the payload when the signature is valid and not expired, otherwise null. */
export function verify<T extends Record<string, unknown>>(token: string | undefined, secret: string, now = Date.now()): (T & { exp: number }) | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = mac(secret, body);
  let given: Buffer;
  try { given = Buffer.from(signature, "base64url"); } catch { return null; }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload?.exp !== "number" || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieOptions(secure: boolean, maxAge: number) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge };
}
