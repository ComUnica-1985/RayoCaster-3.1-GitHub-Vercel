import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const PIN_PATTERN = /^\d{6}$/;

export function validatePin(pin) {
  return PIN_PATTERN.test(String(pin || ""));
}

export async function hashPin(pin, salt = crypto.randomBytes(16).toString("base64url")) {
  if (!validatePin(pin)) throw new Error("PIN_INVALID");
  const key = await scrypt(String(pin), salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt, hash: Buffer.from(key).toString("base64url") };
}

export async function verifyPin(pin, salt, expectedHash) {
  if (!validatePin(pin) || !salt || !expectedHash) return false;
  const result = await hashPin(pin, salt);
  const actual = Buffer.from(result.hash);
  const expected = Buffer.from(String(expectedHash));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function b64(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSignedToken(payload, secret, ttlSeconds) {
  if (!secret || secret.length < 32) throw new Error("SECRET_TOO_SHORT");
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify(fullPayload));
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

export function verifySignedToken(token, secret) {
  try {
    if (!secret || secret.length < 32) return null;
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const unsigned = `${parts[0]}.${parts[1]}`;
    const expected = Buffer.from(sign(unsigned, secret));
    const actual = Buffer.from(parts[2]);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function randomId() {
  return crypto.randomUUID();
}
