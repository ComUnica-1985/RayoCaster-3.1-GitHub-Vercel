import { requireUser } from "../server/lib/auth.js";
import { issueStreamToken } from "../server/lib/stream-token.js";
import { assertAllowedOrigin, json, methodNotAllowed, setSecurityHeaders } from "../server/lib/http.js";

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!assertAllowedOrigin(req)) return json(res, 403, { ok: false, error: "Origen no autorizado." });
  try {
    const user = await requireUser(req);
    if (!user) return json(res, 401, { ok: false, error: "Sesion de escritorio no valida." });
    if (user.mustChangePassword) return json(res, 403, { ok: false, error: "Debe cambiar la contrasena temporal antes de transmitir." });
    return json(res, 200, { ok: true, token: issueStreamToken(user), expiresIn: 120 });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, error: "No fue posible autorizar la transmision." });
  }
}
