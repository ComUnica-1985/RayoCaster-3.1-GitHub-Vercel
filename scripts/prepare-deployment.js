import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}
function fail(message) {
  console.error(message);
  process.exit(1);
}

const serviceAccountPath = arg("--service-account");
const adminEmail = (arg("--admin-email") || "prueba@unico.edu.co").trim().toLowerCase();
if (!serviceAccountPath) fail('Falta --service-account "C:\\ruta\\cuenta.json"');
if (!fs.existsSync(serviceAccountPath)) fail(`No existe la cuenta de servicio: ${serviceAccountPath}`);
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) fail("El correo administrador no es válido.");

let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
} catch {
  fail("El archivo de cuenta de servicio no contiene JSON válido.");
}
for (const key of ["project_id", "client_email", "private_key"]) {
  if (!serviceAccount[key]) fail(`La cuenta de servicio no contiene ${key}.`);
}
if (serviceAccount.project_id !== "radio-unioc") {
  fail(`La cuenta pertenece a ${serviceAccount.project_id}, no a radio-unioc.`);
}

const sessionSecret = crypto.randomBytes(48).toString("base64");
const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const privateDer = privateKey.export({ format: "der", type: "pkcs8" });
const publicDer = publicKey.export({ format: "der", type: "spki" });
const rawPublic = publicDer.subarray(publicDer.length - 32);
const serviceBase64 = Buffer.from(JSON.stringify(serviceAccount)).toString("base64");
const output = path.join(process.cwd(), "deployment-secrets.txt");
const publicOutput = path.join(process.cwd(), "desktop-public-config.txt");

fs.writeFileSync(output, [
  `SESSION_SECRET=${sessionSecret}`,
  `ADMIN_EMAILS=${adminEmail}`,
  "FIREBASE_PROJECT_ID=radio-unioc",
  "FIREBASE_DATABASE_URL=https://radio-unioc-default-rtdb.firebaseio.com",
  "FIREBASE_DATA_ROOT=rayocaster",
  `FIREBASE_SERVICE_ACCOUNT_BASE64=${serviceBase64}`,
  `STREAM_TOKEN_PRIVATE_KEY_BASE64=${privateDer.toString("base64")}`,
].join("\n") + "\n", { encoding: "utf8", mode: 0o600 });

fs.writeFileSync(publicOutput, [
  `streamTokenPublicKeyBase64=${rawPublic.toString("base64")}`,
  "Este archivo contiene solo la clave pública que debe copiarse al ejecutable.",
].join("\n") + "\n", { encoding: "utf8", mode: 0o600 });

console.log(`Archivo privado creado: ${output}`);
console.log(`Configuración pública del escritorio: ${publicOutput}`);
console.log("No suba deployment-secrets.txt a Git ni lo comparta.");
