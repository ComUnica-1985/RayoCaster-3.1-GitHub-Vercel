import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("la web no contiene formulario de login independiente", () => {
  const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.equal(html.includes("LoginUsername"), false);
  assert.equal(html.includes("Abrir consola web"), true);
});
