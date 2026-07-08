import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { issueStreamToken } from "../server/lib/stream-token.js";

test("token Ed25519 coincide con el verificador del gateway Go", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  process.env.STREAM_TOKEN_PRIVATE_KEY_BASE64 = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
  const token = issueStreamToken({ uid: "uid-1", email: "prueba@unico.edu.co" });
  const parts = token.split(".");
  assert.equal(parts[0], "RCT1");
  assert.equal(crypto.verify(null, Buffer.from(parts[0] + "." + parts[1]), publicKey, Buffer.from(parts[2], "base64url")), true);
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  assert.equal(claims.aud, "rayocaster-desktop-gateway");
  assert.equal(claims.purpose, "broadcast");
});
