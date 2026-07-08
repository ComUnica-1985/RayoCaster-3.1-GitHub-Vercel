import test from "node:test";
import assert from "node:assert/strict";
import { createSignedToken, verifySignedToken } from "../server/lib/crypto.js";

test("sesion firmada detecta manipulacion", () => {
  const secret = "x".repeat(48);
  const token = createSignedToken({ purpose: "desktop-web-session", sub: "uid" }, secret, 60);
  assert.equal(verifySignedToken(token, secret).sub, "uid");
  assert.equal(verifySignedToken(token + "x", secret), null);
});
