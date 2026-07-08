import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
if (pkg.dependencies?.["firebase-admin"] !== "12.7.0") {
  console.error("firebase-admin debe permanecer fijado exactamente en 12.7.0.");
  process.exit(1);
}
await import("firebase-admin/app");
await import("firebase-admin/auth");
await import("firebase-admin/database");
let jwks = "no instalado";
try { jwks = require("jwks-rsa/package.json").version; } catch {}
if (jwks.startsWith("4.")) {
  console.error(`jwks-rsa ${jwks} no es compatible con este despliegue.`);
  process.exit(1);
}
console.log(`Runtime compatible: firebase-admin 12.7.0; jwks-rsa ${jwks}.`);
