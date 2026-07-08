import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("la web no contiene formulario de login independiente", () => {
  const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.equal(html.includes("LoginUsername"), false);
  assert.equal(html.includes("Abrir consola web"), true);
});


test("acceso web usa fragmento y canje POST para evitar consumo por prefetch", () => {
  const read = (relative) => fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
  const bootstrap = read("api/desktop-bootstrap.js");
  const exchange = read("api/desktop-exchange.js");
  const app = read("public/app.js");
  assert.match(bootstrap, /#desktopCode=/);
  assert.doesNotMatch(bootstrap, /desktop-exchange\?code=/);
  assert.match(exchange, /req\.method !== "POST"/);
  assert.match(app, /exchangeDesktopCode/);
  assert.match(app, /method: "POST"/);
});
