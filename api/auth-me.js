import { requireUser } from "../server/lib/auth.js";
import { json, methodNotAllowed, setSecurityHeaders } from "../server/lib/http.js";

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const user = await requireUser(req);
    if (!user) return json(res, 401, { ok: false, error: "Abra la consola desde RayoCaster Desktop con una sesion activa." });
    return json(res, 200, { ok: true, user: { uid: user.uid, email: user.email, role: user.role, deviceId: user.deviceId, mustChangePassword: user.mustChangePassword } });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, error: "No fue posible validar la sesion." });
  }
}
