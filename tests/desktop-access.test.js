import test from "node:test";
import assert from "node:assert/strict";
import { codeHash, leaseIsActive, normalizeGatewayUrl, roleForEmail } from "../server/lib/desktop-access.js";

test("lease activa requiere online y vencimiento futuro", () => {
  assert.equal(leaseIsActive({ online: true, lastSeen: Date.now(), expiresAt: Date.now() + 30000 }), true);
  assert.equal(leaseIsActive({ online: false, lastSeen: Date.now(), expiresAt: Date.now() + 30000 }), false);
  assert.equal(leaseIsActive({ online: true, lastSeen: Date.now(), expiresAt: Date.now() - 60000 }), false);
});

test("gateway solo acepta HTTPS y produce WSS", () => {
  assert.equal(normalizeGatewayUrl("https://abc.trycloudflare.com/"), "wss://abc.trycloudflare.com/ws");
  assert.equal(normalizeGatewayUrl("http://localhost:3100"), "");
});

test("rol admin se deriva de ADMIN_EMAILS", () => {
  process.env.ADMIN_EMAILS = "prueba@unico.edu.co";
  assert.equal(roleForEmail("PRUEBA@UNICO.EDU.CO"), "admin");
  assert.equal(roleForEmail("operador@unico.edu.co"), "broadcaster");
});

test("codigo se almacena como hash no reversible", () => {
  const hash = codeHash("codigo-secreto");
  assert.notEqual(hash, "codigo-secreto");
  assert.equal(hash, codeHash("codigo-secreto"));
});
