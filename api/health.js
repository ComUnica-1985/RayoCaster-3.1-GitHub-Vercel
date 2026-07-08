import { firebaseServerConfigured } from "../server/lib/firebase-admin.js";
import { json, methodNotAllowed, setSecurityHeaders } from "../server/lib/http.js";
export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  return json(res, 200, { ok: true, service: "rayocaster-control", version: "3.1.0", storage: "firebase-rtdb", desktopGate: true, firebaseConfigured: firebaseServerConfigured() });
}
