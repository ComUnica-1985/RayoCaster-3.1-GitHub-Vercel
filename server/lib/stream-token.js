import crypto from "node:crypto";

function privateKey() {
  const value = String(process.env.STREAM_TOKEN_PRIVATE_KEY_BASE64 || "").trim();
  if (!value) throw new Error("STREAM_TOKEN_PRIVATE_KEY_BASE64 no esta configurada.");
  return crypto.createPrivateKey({ key: Buffer.from(value, "base64"), format: "der", type: "pkcs8" });
}

export function issueStreamToken(user, ttlSeconds = 120) {
  const payload = Buffer.from(JSON.stringify({
    sub: user.uid,
    email: user.email,
    purpose: "broadcast",
    aud: "rayocaster-desktop-gateway",
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  })).toString("base64url");
  const unsigned = `RCT1.${payload}`;
  const signature = crypto.sign(null, Buffer.from(unsigned), privateKey()).toString("base64url");
  return `${unsigned}.${signature}`;
}
