import { clearSession } from "../server/lib/session.js";
import { json, methodNotAllowed, setSecurityHeaders } from "../server/lib/http.js";
export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  clearSession(res);
  return json(res, 200, { ok: true });
}
