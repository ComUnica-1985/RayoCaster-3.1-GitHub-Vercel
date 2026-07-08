import { json, methodNotAllowed, setSecurityHeaders } from "../server/lib/http.js";

function configured(name) {
  return Boolean(String(process.env[name] || "").trim());
}

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const required = [
    "SESSION_SECRET",
    "ADMIN_EMAILS",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_DATABASE_URL",
    "FIREBASE_SERVICE_ACCOUNT_BASE64",
    "STREAM_TOKEN_PRIVATE_KEY_BASE64",
  ];
  const missing = required.filter((name) => !configured(name));
  return json(res, missing.length ? 503 : 200, {
    ok: missing.length === 0,
    service: "rayocaster-control",
    version: "4.0.0",
    storage: "firebase-rtdb",
    desktopGate: true,
    firebaseConfigured: ["FIREBASE_PROJECT_ID", "FIREBASE_DATABASE_URL", "FIREBASE_SERVICE_ACCOUNT_BASE64"].every(configured),
    missing,
  });
}
